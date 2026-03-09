'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { calendar_v3 } from 'googleapis'

type GoogleCalendarEvent = calendar_v3.Schema$Event

interface CalendarEvent {
  event_id: string
  summary: string
  start_datetime: string
  end_datetime: string
  has_notify: boolean
  student_has_line: boolean
}

interface ResultDetails {
  sent_students?: string[]
  failed_students?: { name: string; error: string }[]
}

export function TomorrowReminders() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ message: string; details: ResultDetails | null } | null>(null)

  const tomorrow = dayjs().add(1, 'day')

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const startDate = tomorrow.startOf('day').toISOString()
      const endDate = tomorrow.endOf('day').toISOString()

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
        .select('event_id, has_notify')
        .in('event_id', eventIds)

      const studentsMap = new Map(studentsData?.map(s => [s.name, s]) || [])
      const notificationsMap = new Map(notificationStatuses?.map(n => [n.event_id, n]) || [])

      setEvents(data.map((event: GoogleCalendarEvent) => ({
        event_id: event.id || '',
        summary: event.summary || '',
        start_datetime: event.start?.dateTime || event.start?.date || '',
        end_datetime: event.end?.dateTime || event.end?.date || '',
        has_notify: notificationsMap.get(event.id || '')?.has_notify || false,
        student_has_line: !!(studentsMap.get(event.summary?.trim() || '')?.line_user_id)
      })))
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const notNotified = events.filter(e => !e.has_notify && e.student_has_line)
  const alreadyNotified = events.filter(e => e.has_notify)

  const handleSendAll = async () => {
    if (notNotified.length === 0) return
    setSending(true)
    setResult(null)
    try {
      const response = await fetch('/api/line-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: notNotified }),
      })
      const res = await response.json()
      setResult({ message: res.message, details: res.summary })
      await fetchEvents()
    } catch (error) {
      setResult({ message: 'Failed to send notifications', details: null })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tomorrow&apos;s Classes ({tomorrow.format('M/D')})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Tomorrow&apos;s Classes ({tomorrow.format('M/D')})
            {events.length > 0 && (
              <Badge variant="secondary" className="text-xs">{events.length}</Badge>
            )}
          </CardTitle>
          {notNotified.length > 0 && (
            <Button
              size="sm"
              onClick={handleSendAll}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? 'Sending...' : `Send Reminders (${notNotified.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No classes scheduled for tomorrow</p>
        ) : (
          <>
            {events.map(event => (
              <div
                key={event.event_id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  event.has_notify
                    ? 'bg-green-50 border border-green-200'
                    : event.student_has_line
                      ? 'bg-white border border-gray-200'
                      : 'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.summary}</span>
                  <span className="text-muted-foreground text-xs">
                    {dayjs(event.start_datetime).format('HH:mm')}
                  </span>
                </div>
                <div>
                  {event.has_notify ? (
                    <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Sent</Badge>
                  ) : !event.student_has_line ? (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">No LINE</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-500">Pending</Badge>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {result && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${result.details?.failed_students?.length ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <p className="font-medium mb-1">{result.message}</p>
            {result.details?.sent_students && result.details.sent_students.length > 0 && (
              <p className="text-green-700 text-xs">Sent: {result.details.sent_students.join(', ')}</p>
            )}
            {result.details?.failed_students && result.details.failed_students.length > 0 && (
              <div className="text-red-700 text-xs mt-1">
                {result.details.failed_students.map((s, i) => (
                  <p key={i}>{s.name}: {s.error}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
