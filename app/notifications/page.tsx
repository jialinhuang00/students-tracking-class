'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Navigation, Breadcrumb } from '@/components/navigation'
import { supabase } from '@/lib/supabase'
import { calendar_v3 } from 'googleapis'

// Google Calendar API Event type
type GoogleCalendarEvent = calendar_v3.Schema$Event

interface CalendarEvent {
  event_id: string
  summary: string
  start_datetime: string
  end_datetime: string
  coach_email?: string
  has_notify?: boolean
  notified_at?: string
  student_has_line?: boolean
}

export default function NotificationsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    details: any;
  }>({ open: false, title: '', message: '', details: null })

  // Extract reusable event data fetching logic
  const fetchEventsData = useCallback(async (date: Date, setLoading?: (loading: boolean) => void) => {
    try {
      setLoading?.(true)
      
      const startDate = dayjs(date).startOf('day').toISOString()
      const endDate = dayjs(date).endOf('day').toISOString()

      const response = await fetch(`/api/google-calendar/events?startDate=${startDate}&endDate=${endDate}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch events')
      }

      const data: GoogleCalendarEvent[] = result.events

      // Batch query optimization: get all needed data at once
      const studentNames = data.map(event => event.summary?.trim()).filter(Boolean)
      const eventIds = data.map(event => event.id).filter(Boolean)

      // Batch query all students' LINE IDs
      const { data: studentsData } = await supabase
        .from('students')
        .select('name, line_user_id')
        .in('name', studentNames)

      // Batch query all events' notification status
      const { data: notificationStatuses } = await supabase
        .from('notification_status')
        .select('event_id, has_notify, notified_at')
        .in('event_id', eventIds)

      // Build query dictionary to improve lookup efficiency
      const studentsMap = new Map(studentsData?.map(s => [s.name, s]) || [])
      const notificationsMap = new Map(notificationStatuses?.map(n => [n.event_id, n]) || [])

      // Combine final data
      const formattedEvents: CalendarEvent[] = data.map((event: GoogleCalendarEvent) => {
        const studentName = event.summary?.trim() || ''
        const studentData = studentsMap.get(studentName)
        const notificationStatus = notificationsMap.get(event.id || '')

        return {
          event_id: event.id || '',
          summary: event.summary || '',
          start_datetime: event.start?.dateTime || event.start?.date || '',
          end_datetime: event.end?.dateTime || event.end?.date || '',
          coach_email: event.attendees?.[0]?.email || undefined,
          has_notify: notificationStatus?.has_notify || false,
          notified_at: notificationStatus?.notified_at || null,
          student_has_line: !!(studentData?.line_user_id)
        }
      })

      return formattedEvents
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    } finally {
      setLoading?.(false)
    }
  }, [])

  // Fetch events from Google Calendar
  useEffect(() => {
    const loadEvents = async () => {
      const eventsData = await fetchEventsData(selectedDate, setFetchLoading)
      setEvents(eventsData)
    }

    loadEvents()
  }, [selectedDate, fetchEventsData])

  const handleStudentToggle = useCallback((eventId: string) => {
    setSelectedStudents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }, [])

  const handleSendNotifications = useCallback(async () => {
    if (selectedStudents.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/line-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events.filter(event => selectedStudents.includes(event.event_id))
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setResultDialog({
          open: true,
          title: 'LINE Notification Results',
          message: result.message,
          details: result.summary
        })
        setSelectedStudents([])
        
        // Use extracted function to re-fetch event data
        const refreshedEvents = await fetchEventsData(selectedDate)
        setEvents(refreshedEvents)
      } else {
        throw new Error(result.error || 'Failed to send notifications')
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
      setResultDialog({
        open: true,
        title: 'Notification Failed',
        message: 'Failed to send notification: ' + (error instanceof Error ? error.message : 'Unknown error'),
        details: null
      })
    } finally {
      setLoading(false)
    }
  }, [selectedStudents, events, fetchEventsData, selectedDate])

  const handleCreateClassRecords = useCallback(async () => {
    if (selectedStudents.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/class-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events.filter(event => selectedStudents.includes(event.event_id))
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setResultDialog({
          open: true,
          title: 'Class Record Creation Results',
          message: result.message,
          details: result.summary
        })
        setSelectedStudents([])
        
        // Use extracted function to re-fetch event data
        const refreshedEvents = await fetchEventsData(selectedDate)
        setEvents(refreshedEvents)
      } else {
        throw new Error(result.error || 'Failed to create class records')
      }
    } catch (error) {
      console.error('Error creating class records:', error)
      setResultDialog({
        open: true,
        title: 'Creation Failed',
        message: 'Failed to create class records: ' + (error instanceof Error ? error.message : 'Unknown error'),
        details: null
      })
    } finally {
      setLoading(false)
    }
  }, [selectedStudents, events, fetchEventsData, selectedDate])

  const handleSelectAll = useCallback(() => {
    const availableEventIds = events
      .filter(event => event.student_has_line) // Only select students with LINE
      .map(event => event.event_id)
    setSelectedStudents(availableEventIds)
  }, [events])

  const handleDeselectAll = useCallback(() => {
    setSelectedStudents([])
  }, [])

  const isAllSelected = events.length > 0 && selectedStudents.length === events.filter(event => event.student_has_line).length

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Breadcrumb items={[{ label: 'Course Notifications' }]} />

        <div className="flex gap-6">
          {/* Calendar Sidebar */}
          <div className="hidden md:block w-80">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Select Date</CardTitle>
                <CardDescription>Choose the date to send notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  disabled={(date) => date < new Date()}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Mobile Date Selector */}
            <div className="md:hidden mb-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select notification date
                  </label>
                  <input
                    type="date"
                    value={dayjs(selectedDate).format('YYYY-MM-DD')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={dayjs().format('YYYY-MM-DD')}
                  />
                </CardContent>
              </Card>
            </div>


            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      Classes on {dayjs(selectedDate).format('M/D')}
                      {!fetchLoading && events.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {events.length} classes
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Select students to send notifications or create class records
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0">
                {fetchLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-muted-foreground">Loading class data...</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="rounded-full h-16 w-16 bg-gray-100 flex items-center justify-center mb-4">
                      <span className="text-2xl">📅</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">No scheduled classes</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      No classes scheduled for {dayjs(selectedDate).format('M/D')}, please check Google Calendar or try again later
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    {/* Card Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6">
                      {events.map((event) => {
                        const name = event.summary.trim()

                        const isSelected = selectedStudents.includes(event.event_id)
                        return (
                          <div
                            key={event.event_id}
                            className={`p-4 rounded-lg border transition-all ${event.has_notify
                              ? 'border-green-200 bg-green-50'
                              : isSelected
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleStudentToggle(event.event_id)}
                                disabled={!event.student_has_line}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium text-sm">{name}</h4>
                                  {event.student_has_line ? (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                      Has LINE
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                      No LINE
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                  <span>
                                    {dayjs(event.start_datetime).format('M/D HH:mm')}
                                  </span>
                                  <span>{event.coach_email?.split('@')[0]}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {event.has_notify ? (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                                    Notified
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                    Not notified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>

              {events.length > 0 && (
                <>
                  {/* Select All Control Area */}
                  <div className="border-t bg-gray-50/50 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Total {events.length} classes, {selectedStudents.length} students selected
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                          className="text-xs"
                        >
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button Area */}
                  <div className="border-t bg-gray-50/50 px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateClassRecords}
                        disabled={selectedStudents.length === 0 || loading}
                        className="min-w-[120px]"
                      >
                        {loading ? 'Processing...' : 'Create Class Records'}
                      </Button>
                      <Button
                        onClick={handleSendNotifications}
                        disabled={selectedStudents.length === 0 || loading}
                        className="min-w-[120px]"
                      >
                        {loading ? 'Sending...' : 'Send Notifications'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Result Dialog */}
      {resultDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {resultDialog.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {resultDialog.message}
            </p>
            
            {resultDialog.details && (
              <div className="space-y-4">
                {/* LINE Notification Results */}
                {resultDialog.details.sent_students && resultDialog.details.sent_students.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ Notification successful ({resultDialog.details.sent_students.length} students):</h4>
                    <div className="bg-green-50 p-3 rounded-md">
                      {resultDialog.details.sent_students.map((name: string, index: number) => (
                        <div key={index} className="text-sm text-green-800">{name}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Record Results */}
                {resultDialog.details.created_students && resultDialog.details.created_students.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ Created successfully ({resultDialog.details.created_students.length} students):</h4>
                    <div className="bg-green-50 p-3 rounded-md">
                      {resultDialog.details.created_students.map((name: string, index: number) => (
                        <div key={index} className="text-sm text-green-800">{name}</div>
                      ))}
                    </div>
                  </div>
                )}

                {resultDialog.details.skipped_students && resultDialog.details.skipped_students.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2">⏭️ Record already exists ({resultDialog.details.skipped_students.length} students):</h4>
                    <div className="bg-yellow-50 p-3 rounded-md">
                      {resultDialog.details.skipped_students.map((name: string, index: number) => (
                        <div key={index} className="text-sm text-yellow-800">{name}</div>
                      ))}
                    </div>
                  </div>
                )}

                {resultDialog.details.failed_students && resultDialog.details.failed_students.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">❌ Failed ({resultDialog.details.failed_students.length} students):</h4>
                    <div className="bg-red-50 p-3 rounded-md">
                      {resultDialog.details.failed_students.map((student: any, index: number) => (
                        <div key={index} className="text-sm text-red-800">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs opacity-75">{student.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setResultDialog(prev => ({ ...prev, open: false }))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}