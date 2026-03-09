'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface ClassRecord {
  id: number
  student_id: number
  class_date: string
  attended: boolean | null
  student: {
    name: string
    phone?: string
    remaining_classes: number
  }
}

export function TodayAttendance() {
  const [records, setRecords] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    async function fetchRecords() {
      try {
        const today = dayjs()
        const { data, error } = await supabase
          .from('class_records')
          .select(`
            id, student_id, class_date, attended,
            student:students (name, phone, remaining_classes)
          `)
          .gte('class_date', today.startOf('day').toISOString())
          .lt('class_date', today.add(1, 'day').startOf('day').toISOString())
          .order('class_date', { ascending: true })

        if (error) {
          console.error('Error fetching records:', error)
          return
        }

        const studentData = (s: unknown) => {
          const arr = s as { name: string; phone?: string; remaining_classes: number }[]
          return arr?.[0] || { name: 'Unknown', remaining_classes: 0 }
        }
        setRecords(data.map(record => ({
          id: record.id,
          student_id: record.student_id,
          class_date: record.class_date,
          attended: record.attended,
          student: studentData(record.student)
        })))
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [])

  const handleUpdate = async (recordId: number, attended: boolean) => {
    setUpdating(recordId)
    try {
      const response = await fetch('/api/confirm-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          attended,
          skipDecrement: !attended // Only deduct if attended
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setRecords(prev =>
          prev.map(r =>
            r.id === recordId
              ? {
                  ...r,
                  attended,
                  student: {
                    ...r.student,
                    remaining_classes: result.newRemainingClasses || r.student.remaining_classes
                  }
                }
              : r
          )
        )
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
    } finally {
      setUpdating(null)
    }
  }

  const pending = records.filter(r => r.attended === null)
  const processed = records.filter(r => r.attended !== null)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Attendance ({dayjs().format('M/D')})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Today&apos;s Attendance ({dayjs().format('M/D')})
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pending.length} pending</Badge>
          )}
        </CardTitle>
        {pending.length > 0 && (
          <CardDescription className="text-xs">
            Tap to mark attended (deducts 1 class) or absent
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No classes today</p>
        ) : (
          <>
            {/* Pending */}
            {pending.map(record => (
              <div key={record.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{record.student.name}</span>
                    <span className="text-xs text-blue-600">{record.student.remaining_classes} left</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {dayjs(record.class_date).format('HH:mm')}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate(record.id, false)}
                    disabled={updating === record.id}
                    className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Absent
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(record.id, true)}
                    disabled={updating === record.id}
                    className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700"
                  >
                    Attended
                  </Button>
                </div>
              </div>
            ))}

            {/* Already processed */}
            {processed.map(record => (
              <div
                key={record.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  record.attended
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{record.student.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {dayjs(record.class_date).format('HH:mm')}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    record.attended
                      ? 'text-green-700 border-green-300'
                      : 'text-red-700 border-red-300'
                  }`}
                >
                  {record.attended ? 'Attended' : 'Absent'}
                </Badge>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
