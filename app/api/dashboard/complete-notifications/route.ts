import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 1. Get all Google Calendar events for tomorrow
    const { getCalendarEvents } = await import('@/lib/google-calendar')
    
    const result = await getCalendarEvents(
      dayjs().add(1, 'day').startOf('day').toDate(),
      dayjs().add(1, 'day').endOf('day').toDate()
    )

    if (!result.success || !result.events || result.events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No classes tomorrow that need notifications',
        details: { total_events: 0, notifications_sent: 0 }
      })
    }

    // 2. Check which events have already been notified
    const eventIds = result.events.map(event => event.id).filter(Boolean)
    
    const { data: notificationStatuses, error: notificationError } = await supabase
      .from('notification_status')
      .select('event_id, has_notify')
      .in('event_id', eventIds)
      .eq('has_notify', true)

    if (notificationError) {
      console.error('Error fetching notification status:', notificationError)
    }

    // 3. Filter out events that haven't been notified yet
    const notifiedEventIds = new Set(notificationStatuses?.map(n => n.event_id) || [])
    const pendingEvents = result.events.filter(event => event.id && !notifiedEventIds.has(event.id))

    if (pendingEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All tomorrow\'s course notifications have been sent',
        details: { 
          total_events: result.events.length, 
          already_notified: result.events.length,
          notifications_sent: 0 
        }
      })
    }

    // 4. Convert pending events to the format required by line-notifications API
    const events = pendingEvents.map(event => ({
      event_id: event.id,
      summary: event.summary,
      start_datetime: event.start?.dateTime || event.start?.date,
      end_datetime: event.end?.dateTime || event.end?.date
    }))

    // 5. Call line-notifications API to send notifications
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/line-notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      }
    )

    const notificationResult = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Completed tomorrow's course notifications: sent ${notificationResult.summary?.notifications_sent || 0} notifications`,
        details: notificationResult
      })
    } else {
      return NextResponse.json({
        success: false,
        error: notificationResult.error || 'Failed to send notifications'
      }, { status: response.status })
    }

  } catch (error) {
    console.error('Complete notifications API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}