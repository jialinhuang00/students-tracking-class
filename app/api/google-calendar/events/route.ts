import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvents } from '@/lib/google-calendar'
import { calendar_v3 } from 'googleapis'
import dayjs from 'dayjs'

// Google Calendar API Event type
type GoogleCalendarEvent = calendar_v3.Schema$Event

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    // Default query range: from today to 30 days later
    const startDate = startDateParam 
      ? dayjs(startDateParam).startOf('day').toDate()
      : dayjs().startOf('day').toDate()
      
    const endDate = endDateParam
      ? dayjs(endDateParam).endOf('day').toDate() 
      : dayjs().add(30, 'day').endOf('day').toDate()

    console.log(`Fetching Google Calendar events from ${startDate} to ${endDate}`)

    const result = await getCalendarEvents(startDate, endDate)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch calendar events' },
        { status: 500 }
      )
    }

    // Return Google Calendar raw data directly
    return NextResponse.json({
      success: true,
      events: result.events,
      count: result.events.length,
    })

  } catch (error) {
    console.error('Google Calendar API Error:', error)
    return NextResponse.json(
      { error: 'Unable to fetch Google Calendar events' },
      { status: 500 }
    )
  }
}