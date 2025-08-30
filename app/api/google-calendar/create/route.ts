import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent, CreateEventData } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summary, startDateTime, endDateTime, coachEmail, description } = body

    if (!summary || !startDateTime || !endDateTime || !coachEmail) {
      return NextResponse.json(
        { error: 'Missing required parameters: summary, startDateTime, endDateTime, coachEmail' },
        { status: 400 }
      )
    }

    const eventData: CreateEventData = {
      summary,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      coachEmail,
      description: description || `Class: ${summary}`,
    }

    const result = await createCalendarEvent(eventData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create calendar event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      message: 'Event created successfully',
    })

  } catch (error) {
    console.error('Create Calendar Event API Error:', error)
    return NextResponse.json(
      { error: 'Failed to create Google Calendar event' },
      { status: 500 }
    )
  }
}