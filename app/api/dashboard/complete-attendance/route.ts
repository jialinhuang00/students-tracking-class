import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Query pending attendance records for today and the past two days (full 72 hours)
    const todayEnd = dayjs().endOf('day').toISOString()      // Today 23:59:59
    const twoDaysAgoStart = dayjs().subtract(2, 'day').startOf('day').toISOString()  // Day before yesterday 00:00:00

    const { data: pendingRecords, error: fetchError } = await supabase
      .from('class_records')
      .select(`
        id, 
        class_date, 
        student_id,
        student:students (
          name
        )
      `)
      .gte('class_date', twoDaysAgoStart)
      .lte('class_date', todayEnd)
      .is('attended', null)

    if (fetchError) {
      console.error('Error fetching pending records:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to query pending records' },
        { status: 500 }
      )
    }

    if (!pendingRecords || pendingRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No attendance records need confirmation',
        updated: 0
      })
    }

    // Batch update to attended (attended = true) and update timestamp
    const recordIds = pendingRecords.map(record => record.id)
    
    const { data: updatedRecords, error: updateError } = await supabase
      .from('class_records')
      .update({ 
        attended: true,
        updated_at: dayjs().toISOString()
      })
      .in('id', recordIds)
      .select()

    if (updateError) {
      console.error('Error updating attendance records:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update attendance records' },
        { status: 500 }
      )
    }

    // Organize confirmed student and date information
    const confirmedAttendance = pendingRecords.map((record: any) => ({
      student_name: record.student?.name || 'Unknown Student',
      class_date: dayjs(record.class_date).format('M/D HH:mm'),
      date_only: dayjs(record.class_date).format('M/D')
    }))

    // Group by date
    const attendanceByDate = confirmedAttendance.reduce((acc, item) => {
      if (!acc[item.date_only]) {
        acc[item.date_only] = []
      }
      acc[item.date_only].push(item.student_name)
      return acc
    }, {} as Record<string, string[]>)

    return NextResponse.json({
      success: true,
      message: `Batch confirmed ${pendingRecords.length} attendance records as attended`,
      updated: pendingRecords.length,
      records: updatedRecords,
      summary: {
        total_confirmed: pendingRecords.length,
        confirmed_students: confirmedAttendance,
        attendance_by_date: attendanceByDate
      }
    })

  } catch (error) {
    console.error('Complete attendance API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}