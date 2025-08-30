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
        message: 'No classes tomorrow that need records created',
        details: { total_events: 0, records_created: 0 }
      })
    }

    // 2. Check which events already have class records created
    const eventIds = result.events.map(event => event.id).filter(Boolean)
    
    const { data: existingRecords, error: recordsError } = await supabase
      .from('class_records')
      .select('event_id')
      .in('event_id', eventIds)

    if (recordsError) {
      console.error('Error fetching existing class records:', recordsError)
    }

    // 3. Filter out events that don't have class records yet
    const existingEventIds = new Set(existingRecords?.map(r => r.event_id) || [])
    const pendingEvents = result.events.filter(event => event.id && !existingEventIds.has(event.id))

    if (pendingEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All tomorrow\'s class records have been created',
        details: { 
          total_events: result.events.length, 
          already_created: result.events.length,
          records_created: 0 
        }
      })
    }

    // 4. Convert pending events to the format required by class-records API
    const events = pendingEvents.map(event => ({
      event_id: event.id,
      summary: event.summary,
      start_datetime: event.start?.dateTime || event.start?.date,
      end_datetime: event.end?.dateTime || event.end?.date
    }))

    // 5. Call class-records API to create class records
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/class-records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      }
    )

    const recordResult = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Completed tomorrow's class record creation: created ${recordResult.summary?.records_created || 0} records`,
        details: recordResult
      })
    } else {
      return NextResponse.json({
        success: false,
        error: recordResult.error || 'Failed to create class records'
      }, { status: response.status })
    }

  } catch (error) {
    console.error('Complete class records API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}