import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Calculate tomorrow's date
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

    // Calculate date range for today and previous two days (full 72 hours)
    const todayEnd = dayjs().endOf('day').toISOString()      // Today 23:59:59
    const twoDaysAgoStart = dayjs().subtract(2, 'day').startOf('day').toISOString()  // Two days ago 00:00:00

    // 1. Use Google Calendar API to query tomorrow's classes
    const tomorrowStart = dayjs().add(1, 'day').startOf('day').toISOString()
    const tomorrowEnd = dayjs().add(1, 'day').endOf('day').toISOString()

    // Use internal API call to avoid network requests
    const { getCalendarEvents } = await import('@/lib/google-calendar')

    const result = await getCalendarEvents(
      dayjs().add(1, 'day').startOf('day').toDate(),
      dayjs().add(1, 'day').endOf('day').toDate()
    )

    let totalTomorrowEvents = 0
    let notifiedEvents = 0

    if (result.success && result.events) {
      totalTomorrowEvents = result.events.length
      const eventIds = result.events.map(event => event.id).filter(Boolean)

      // 2. Batch query notification status
      if (eventIds.length > 0) {
        const { data: notificationData, error: notificationError } = await supabase
          .from('notification_status')
          .select('event_id, has_notify')
          .in('event_id', eventIds)

        if (notificationError) {
          console.error('Error fetching notification status:', notificationError)
        } else {
          notifiedEvents = notificationData?.filter(notification => notification.has_notify === true).length || 0
        }
      }
    } else {
      console.error('Error fetching tomorrow calendar events:', result.error)
    }

    // 3. Query class_records attendance status for today + previous two days (full 72 hours)
    const { data: recentRecords, error: recordsError } = await supabase
      .from('class_records')
      .select('id, class_date, attended')
      .gte('class_date', twoDaysAgoStart)
      .lte('class_date', todayEnd)

    if (recordsError) {
      console.error('Error fetching recent class records:', recordsError)
      return NextResponse.json(
        { error: 'Failed to query recent attendance records' },
        { status: 500 }
      )
    }

    // Calculate attendance statistics
    const totalRecentRecords = recentRecords?.length || 0
    const confirmedAttendance = recentRecords?.filter(record => record.attended !== null).length || 0

    // 4. Query tomorrow's Google Events and corresponding class_records
    let totalEventsNeedingRecords = 0
    let existingClassRecords = 0

    if (result.success && result.events) {
      totalEventsNeedingRecords = result.events.length
      const eventIds = result.events.map(event => event.id).filter(Boolean)

      if (eventIds.length > 0) {
        const { data: existingRecords, error: recordsError } = await supabase
          .from('class_records')
          .select('event_id')
          .in('event_id', eventIds)

        if (recordsError) {
          console.error('Error fetching existing class records:', recordsError)
        } else {
          existingClassRecords = existingRecords?.length || 0
        }
      }
    }

    return NextResponse.json({
      success: true,
      notifications: {
        total: totalTomorrowEvents,
        completed: notifiedEvents,
        percentage: totalTomorrowEvents > 0 ? Math.round((notifiedEvents / totalTomorrowEvents) * 100) : 0
      },
      attendance: {
        total: totalRecentRecords,
        completed: confirmedAttendance,
        percentage: totalRecentRecords > 0 ? Math.round((confirmedAttendance / totalRecentRecords) * 100) : 0
      },
      classRecords: {
        total: totalEventsNeedingRecords,
        completed: existingClassRecords,
        percentage: totalEventsNeedingRecords > 0 ? Math.round((existingClassRecords / totalEventsNeedingRecords) * 100) : 0
      }
    })

  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}