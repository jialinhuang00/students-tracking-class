import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing startDate or endDate parameters' },
        { status: 400 }
      )
    }

    // Query class records within specified date range, group by date for statistics
    const { data, error } = await supabase
      .from('class_records')
      .select('class_date, attended')
      .gte('class_date', startDate)
      .lte('class_date', endDate)

    if (error) {
      console.error('Error fetching class records count:', error)
      return NextResponse.json(
        { error: 'Failed to query class records' },
        { status: 500 }
      )
    }

    // Group by date for statistics, count each status
    const dateStatsMap = new Map<string, { total: number, completed: number, pending: number, absent: number }>()
    
    data.forEach(record => {
      const date = dayjs(record.class_date).format('YYYY-MM-DD')
      const stats = dateStatsMap.get(date) || { total: 0, completed: 0, pending: 0, absent: 0 }
      
      stats.total++
      if (record.attended === true) {
        stats.completed++
      } else if (record.attended === false) {
        stats.absent++
      } else {
        stats.pending++
      }
      
      dateStatsMap.set(date, stats)
    })

    // Convert to object format
    const dateStats: Record<string, { total: number, completed: number, pending: number, absent: number }> = {}
    dateStatsMap.forEach((stats, date) => {
      dateStats[date] = stats
    })

    return NextResponse.json({
      success: true,
      dateStats,
      total: data.length
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}