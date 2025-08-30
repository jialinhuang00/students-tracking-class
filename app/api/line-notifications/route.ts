import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'
import { supabase } from '@/lib/supabase'

dayjs.locale('zh-tw')

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Please select students to send notifications to' },
        { status: 400 }
      )
    }

    let notificationsSent = 0
    let notificationsFailed = 0
    const processedEvents = []
    const errors = []

    // Process each selected event
    for (const eventData of events) {
      const eventResult = {
        event_id: eventData.event_id,
        student_name: eventData.summary?.trim() || '',
        notification_sent: false,
        error: null as string | null
      }

      try {
        if (!eventData.event_id || !eventData.summary || !eventData.start_datetime) {
          eventResult.error = 'Event data incomplete'
          processedEvents.push(eventResult)
          errors.push(`Event ${eventData.event_id || 'unknown'}: data incomplete`)
          continue
        }

        const studentName = eventData.summary.trim()
        eventResult.student_name = studentName

        // Find existing student by name
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('name', studentName)
          .single()

        if (!student) {
          eventResult.error = 'Student not found'
          processedEvents.push(eventResult)
          errors.push(`Student ${studentName}: no corresponding student record found`)
          continue
        }

        // Send LINE notification
        if (student.line_user_id) {
          try {
            const classDate = dayjs(eventData.start_datetime)
            const message = `🏃‍♂️ Class Reminder\n\n📅 Date: ${classDate.format('M/D (dddd)')}\n⏰ Time: ${classDate.format('HH:mm')}\n\nPlease attend class on time!`

            const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/line/send-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: student.line_user_id,
                message: message
              })
            })

            if (response.ok) {
              eventResult.notification_sent = true
              notificationsSent++

              // Update notification status
              await supabase
                .from('notification_status')
                .upsert({
                  event_id: eventData.event_id,
                  has_notify: true,
                  notified_at: dayjs().toISOString(),
                  updated_at: dayjs().toISOString()
                })
            } else {
              const errorData = await response.json()
              notificationsFailed++
              eventResult.error = `Notification failed: ${errorData.error}`
            }
          } catch (error) {
            notificationsFailed++
            eventResult.error = `Notification error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        } else {
          eventResult.error = 'Student has no LINE ID'
        }

        processedEvents.push(eventResult)

      } catch (eventError) {
        eventResult.error = `Error processing event: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`
        processedEvents.push(eventResult)
        errors.push(`Event ${eventData.event_id}: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`)
      }
    }

    const sentStudents = processedEvents
      .filter(event => event.notification_sent)
      .map(event => event.student_name)
    
    const failedStudents = processedEvents
      .filter(event => event.error)
      .map(event => ({ name: event.student_name, error: event.error }))

    const summary = {
      total_events: events.length,
      notifications_sent: notificationsSent,
      notifications_failed: notificationsFailed,
      sent_students: sentStudents,
      failed_students: failedStudents,
    }

    const message = `Notification processing completed: sent ${notificationsSent}, failed ${notificationsFailed}`

    return NextResponse.json({
      success: true,
      summary,
      message,
      details: processedEvents,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}