import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { studentId, name, phone, totalClasses, remainingClasses } = await request.json()
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing student ID' },
        { status: 400 }
      )
    }
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (totalClasses !== undefined) updateData.total_classes = totalClasses
    if (remainingClasses !== undefined) updateData.remaining_classes = remainingClasses
    
    const { data: updatedStudent, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating student:', error)
      return NextResponse.json(
        { error: 'Failed to update student data: ' + error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: 'Student data updated successfully'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to update student data' },
      { status: 500 }
    )
  }
}