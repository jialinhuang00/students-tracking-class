'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface Student {
  id: number
  name: string
  phone?: string
  remaining_classes: number
  total_classes: number
}

export function LowBalanceAlert() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLowBalance() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, phone, remaining_classes, total_classes')
          .lte('remaining_classes', 2)
          .order('remaining_classes', { ascending: true })

        if (error) {
          console.error('Error fetching students:', error)
          return
        }

        setStudents(data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLowBalance()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Low Balance Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-12 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) return null

  return (
    <Card className="border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Low Balance Students
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
            {students.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {students.map(student => (
          <div
            key={student.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
              student.remaining_classes === 0
                ? 'bg-red-50 border border-red-200'
                : 'bg-orange-50 border border-orange-200'
            }`}
          >
            <div>
              <span className="font-medium">{student.name}</span>
              {student.phone && (
                <span className="text-xs text-muted-foreground ml-2">{student.phone}</span>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                student.remaining_classes === 0
                  ? 'text-red-700 border-red-300 bg-red-100'
                  : 'text-orange-700 border-orange-300 bg-orange-100'
              }`}
            >
              {student.remaining_classes} / {student.total_classes} left
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
