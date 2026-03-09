'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Navigation } from '@/components/navigation'
import { supabase } from '@/lib/supabase'
import { calendar_v3 } from 'googleapis'

type GoogleCalendarEvent = calendar_v3.Schema$Event

interface CalendarEvent {
  event_id: string
  summary: string
  start_datetime: string
  end_datetime: string
  has_notify: boolean
  notified_at?: string
  student_has_line: boolean
}

interface ResultDetails {
  sent_students?: string[]
  created_students?: string[]
  skipped_students?: string[]
  failed_students?: { name: string; error: string }[]
}

export default function NotificationsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(dayjs().add(1, 'day').toDate())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [result, setResult] = useState<{ title: string; details: ResultDetails | null } | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setFetchLoading(true)
      const date = dayjs(selectedDate)
      const startDate = date.startOf('day').toISOString()
      const endDate = date.endOf('day').toISOString()

      const response = await fetch(`/api/google-calendar/events?startDate=${startDate}&endDate=${endDate}`)
      const res = await response.json()
      if (!response.ok) return

      const data: GoogleCalendarEvent[] = res.events
      const studentNames = data.map(e => e.summary?.trim()).filter(Boolean)
      const eventIds = data.map(e => e.id).filter(Boolean)

      const { data: studentsData } = await supabase
        .from('students')
        .select('name, line_user_id')
        .in('name', studentNames)

      const { data: notificationStatuses } = await supabase
        .from('notification_status')
        .select('event_id, has_notify, notified_at')
        .in('event_id', eventIds)

      const studentsMap = new Map(studentsData?.map(s => [s.name, s]) || [])
      const notificationsMap = new Map(notificationStatuses?.map(n => [n.event_id, n]) || [])

      const formatted: CalendarEvent[] = data.map((event: GoogleCalendarEvent) => ({
        event_id: event.id || '',
        summary: event.summary || '',
        start_datetime: event.start?.dateTime || event.start?.date || '',
        end_datetime: event.end?.dateTime || event.end?.date || '',
        has_notify: notificationsMap.get(event.id || '')?.has_notify || false,
        notified_at: notificationsMap.get(event.id || '')?.notified_at || undefined,
        student_has_line: !!(studentsMap.get(event.summary?.trim() || '')?.line_user_id)
      }))

      setEvents(formatted)
      setSelected([])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setFetchLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectableEvents = events.filter(e => !e.has_notify && e.student_has_line)
  const allSelected = selectableEvents.length > 0 && selectableEvents.every(e => selected.includes(e.event_id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected([])
    } else {
      setSelected(selectableEvents.map(e => e.event_id))
    }
  }

  const sendNotifications = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/line-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: events.filter(e => selected.includes(e.event_id))
        }),
      })
      const res = await response.json()
      setResult({ title: res.message, details: res.summary })
      setSelected([])
      await fetchEvents()
    } catch {
      setResult({ title: 'Failed to send notifications', details: null })
    } finally {
      setLoading(false)
    }
  }

  const createRecords = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/class-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: events.filter(e => selected.includes(e.event_id))
        }),
      })
      const res = await response.json()
      setResult({ title: res.message, details: res.summary })
      setSelected([])
      await fetchEvents()
    } catch {
      setResult({ title: 'Failed to create records', details: null })
    } finally {
      setLoading(false)
    }
  }

  const displayDate = dayjs(selectedDate).format('M/D')

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Notifications</h1>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm h-8">
                {dayjs(selectedDate).format('YYYY-MM-DD')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date)
                    setCalendarOpen(false)
                  }
                }}
                disabled={(date) => dayjs(date).isBefore(dayjs(), 'day')}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-4" style={{ minHeight: '500px' }}>
          {/* Left: Event List */}
          <div className="w-80 bg-background rounded-lg border overflow-hidden flex flex-col shrink-0">
            <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {fetchLoading ? 'Loading...' : `${events.length} classes on ${displayDate}`}
              </span>
              {selectableEvents.length > 0 && (
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {allSelected ? 'Deselect' : 'Select all'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {fetchLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : events.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No classes on {displayDate}
                </div>
              ) : (
                events.map(event => {
                  const isSelected = selected.includes(event.event_id)
                  const canSelect = !event.has_notify && event.student_has_line

                  if (event.has_notify) {
                    return (
                      <div key={event.event_id} className="flex items-center gap-3 px-4 py-3 bg-green-50/50 dark:bg-green-950/20">
                        <span className="text-green-600 text-sm w-4 text-center">&#10003;</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{event.summary}</div>
                          <div className="text-xs text-muted-foreground">{dayjs(event.start_datetime).format('HH:mm')}</div>
                        </div>
                        <span className="text-xs text-green-600">Sent</span>
                      </div>
                    )
                  }

                  return (
                    <label
                      key={event.event_id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        canSelect
                          ? `cursor-pointer hover:bg-accent ${isSelected ? 'bg-accent/50' : ''}`
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => canSelect && toggle(event.event_id)}
                        disabled={!canSelect}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{event.summary}</div>
                        <div className="text-xs text-muted-foreground">{dayjs(event.start_datetime).format('HH:mm')}</div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${event.student_has_line ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </label>
                  )
                })
              )}
            </div>

            {events.length > 0 && (
              <div className="px-4 py-3 border-t bg-muted/50 space-y-2">
                <Button
                  onClick={sendNotifications}
                  disabled={selected.length === 0 || loading}
                  className="w-full"
                  size="sm"
                >
                  {loading ? 'Processing...' : `Send notifications (${selected.length})`}
                </Button>
                <Button
                  variant="outline"
                  onClick={createRecords}
                  disabled={selected.length === 0 || loading}
                  className="w-full"
                  size="sm"
                >
                  Create class records ({selected.length})
                </Button>
              </div>
            )}
          </div>

          {/* Right: Preview & Results */}
          <div className="flex-1 bg-background rounded-lg border p-6 overflow-y-auto">
            {result ? (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Result</div>
                <p className="font-medium">{result.title}</p>

                {result.details?.sent_students && result.details.sent_students.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2">
                      Sent ({result.details.sent_students.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.details.sent_students.map((name, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.details?.created_students && result.details.created_students.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2">
                      Created ({result.details.created_students.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.details.created_students.map((name, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.details?.skipped_students && result.details.skipped_students.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-700 mb-2">
                      Already exists ({result.details.skipped_students.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.details.skipped_students.map((name, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.details?.failed_students && result.details.failed_students.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-2">
                      Failed ({result.details.failed_students.length})
                    </p>
                    {result.details.failed_students.map((s, i) => (
                      <div key={i} className="text-xs text-red-700">
                        <span className="font-medium">{s.name}</span>: {s.error}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResult(null)}
                  className="text-xs mt-4"
                >
                  Back to preview
                </Button>
              </div>
            ) : selected.length > 0 ? (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Message Preview</div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium">
                    Hi {events.find(e => e.event_id === selected[0])?.summary || 'Student'}!
                  </p>
                  <p>
                    Reminder: You have a class on {displayDate} at{' '}
                    {dayjs(events.find(e => e.event_id === selected[0])?.start_datetime).format('HH:mm')}.
                  </p>
                  <p className="text-muted-foreground">-- ClassNudge</p>
                </div>

                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Selected ({selected.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {selected.map(id => {
                    const event = events.find(e => e.event_id === id)
                    return event ? (
                      <span key={id} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {event.summary}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <p>Select students to preview message</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
