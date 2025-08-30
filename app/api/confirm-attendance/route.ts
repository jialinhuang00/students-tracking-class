import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { recordId, attended = true, skipDecrement = false } = await request.json()
    
    if (!recordId) {
      return NextResponse.json(
        { error: 'Missing record ID' },
        { status: 400 }
      )
    }

    // 1. Get the record with student info (allow modification of existing records)
    const { data: record, error: recordError } = await supabase
      .from('class_records')
      .select(`
        *,
        student:students (
          id,
          name,
          remaining_classes
        )
      `)
      .eq('id', recordId)
      .single()
    
    if (recordError || !record) {
      console.error('Record error:', recordError)
      return NextResponse.json(
        { error: 'Failed to query class record: ' + (recordError?.message || 'Unknown error') },
        { status: 500 }
      )
    }

    // Check if we need to decrease classes and if student has enough remaining classes
    if (attended && !skipDecrement && record.student.remaining_classes <= 0) {
      return NextResponse.json(
        { error: 'Student has insufficient remaining classes, cannot deduct class' },
        { status: 400 }
      )
    }

    // 2. Update attendance record
    const { error: updateRecordError } = await supabase
      .from('class_records')
      .update({ 
        attended: attended,
        updated_at: dayjs().toISOString()
      })
      .eq('id', recordId)

    if (updateRecordError) {
      console.error('Error updating record:', updateRecordError)
      return NextResponse.json(
        { error: 'Failed to update class record' },
        { status: 500 }
      )
    }

    let newRemainingClasses = record.student.remaining_classes

    // 3. Update remaining classes for student if needed
    if (attended && !skipDecrement) {
      newRemainingClasses = record.student.remaining_classes - 1
      const { error: updateStudentError } = await supabase
        .from('students')
        .update({ 
          remaining_classes: newRemainingClasses,
          updated_at: dayjs().toISOString()
        })
        .eq('id', record.student.id)

      if (updateStudentError) {
        console.error('Error updating student:', updateStudentError)
        
        // Rollback the record update if student update fails
        await supabase
          .from('class_records')
          .update({ 
            attended: record.attended, // restore original value
            updated_at: dayjs().toISOString()
          })
          .eq('id', recordId)
        
        return NextResponse.json(
          { error: 'Failed to update student remaining classes' },
          { status: 500 }
        )
      }
    }

    const statusText = attended ? 'attended' : 'absent'
    const actionText = attended && !skipDecrement ? `, ${newRemainingClasses} classes remaining` : ''

    return NextResponse.json({
      success: true,
      recordId,
      studentName: record.student.name,
      newRemainingClasses,
      message: `Successfully set ${record.student.name} as ${statusText}${actionText}`
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance status' },
      { status: 500 }
    )
  }
}