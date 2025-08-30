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
        { error: 'Please select courses to create records for' },
        { status: 400 }
      )
    }

    let recordsCreated = 0
    let recordsSkipped = 0
    const processedEvents = []
    const errors = []

    // Process each selected event
    for (const eventData of events) {
      const eventResult = {
        event_id: eventData.event_id,
        student_name: eventData.summary?.trim() || '',
        record_created: false,
        record_already_exists: false,
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

        // Check if record already exists
        const { data: existingRecord } = await supabase
          .from('class_records')
          .select('id')
          .eq('event_id', eventData.event_id)
          .single()

        if (existingRecord) {
          eventResult.record_already_exists = true
          recordsSkipped++
        } else {
          // Create new class record
          const { error: recordError } = await supabase
            .from('class_records')
            .insert({
              student_id: student.id,
              class_date: eventData.start_datetime,
              event_id: eventData.event_id,
              attended: null
            })

          if (recordError) {
            // Check if it's a unique constraint error (concurrent creation)
            if (recordError.code === '23505' && recordError.message?.includes('unique_event_id')) {
              eventResult.record_already_exists = true
              recordsSkipped++
            } else {
              eventResult.error = `Failed to create class record: ${recordError.message}`
              errors.push(`Student ${studentName}: failed to create class record`)
            }
          } else {
            eventResult.record_created = true
            recordsCreated++
          }
        }

        processedEvents.push(eventResult)

      } catch (eventError) {
        eventResult.error = `Error processing event: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`
        processedEvents.push(eventResult)
        errors.push(`Event ${eventData.event_id}: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`)
      }
    }

    const createdStudents = processedEvents
      .filter(event => event.record_created)
      .map(event => event.student_name)
    
    const skippedStudents = processedEvents
      .filter(event => event.record_already_exists)
      .map(event => event.student_name)
    
    const failedStudents = processedEvents
      .filter(event => event.error && !event.record_already_exists)
      .map(event => ({ name: event.student_name, error: event.error }))

    const summary = {
      total_events: events.length,
      records_created: recordsCreated,
      records_skipped: recordsSkipped,
      created_students: createdStudents,
      skipped_students: skippedStudents,
      failed_students: failedStudents,
    }

    const message = `Class record processing completed: created ${recordsCreated}, already existed ${recordsSkipped}`

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
      { error: 'Failed to create class records' },
      { status: 500 }
    )
  }
}