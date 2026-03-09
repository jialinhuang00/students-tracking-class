'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Navigation } from '@/components/navigation'
import { supabase } from '@/lib/supabase'

interface ClassRecordWithStudent {
  id: number
  student_id: number
  coach_id: number
  class_date: string
  attended: boolean | null
  created_at: string
  updated_at: string
  student: {
    name: string
    phone?: string
    remaining_classes: number
  }
}

export default function AttendancePage() {
  const [records, setRecords] = useState<ClassRecordWithStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateStats, setDateStats] = useState<Record<string, { total: number, completed: number, pending: number, absent: number }>>({})

  const [dialog, setDialog] = useState<{
    open: boolean
    type: 'confirm' | 'absence' | 'status-change'
    recordId: number | null
    studentName: string
    currentStatus: boolean | null
    newStatus: boolean | null
  }>({ open: false, type: 'confirm', recordId: null, studentName: '', currentStatus: null, newStatus: null })

  useEffect(() => {
    async function fetchClassRecords() {
      try {
        const { data, error } = await supabase
          .from('class_records')
          .select(`
            *,
            student:students (
              name,
              phone,
              remaining_classes
            )
          `)
          .gte('class_date', dayjs(selectedDate).format('YYYY-MM-DDT00:00:00'))
          .lt('class_date', dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DDT00:00:00'))
          .order('class_date', { ascending: false })

        if (error) {
          console.error('Error fetching records:', error)
          return
        }

        const formattedRecords: ClassRecordWithStudent[] = data.map(record => ({
          id: record.id,
          student_id: record.student_id,
          coach_id: record.coach_id,
          class_date: record.class_date,
          attended: record.attended,
          created_at: record.created_at,
          updated_at: record.updated_at,
          student: {
            name: record.student.name,
            phone: record.student.phone,
            remaining_classes: record.student.remaining_classes
          }
        }))

        setRecords(formattedRecords)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setFetchLoading(false)
      }
    }

    fetchClassRecords()
  }, [selectedDate])

  useEffect(() => {
    async function fetchDateStats() {
      try {
        const startDate = dayjs(selectedDate).subtract(2, 'month').startOf('month').format('YYYY-MM-DDT00:00:00')
        const endDate = dayjs(selectedDate).add(2, 'month').endOf('month').format('YYYY-MM-DDT23:59:59')

        const response = await fetch(`/api/class-records/count?startDate=${startDate}&endDate=${endDate}`)
        const result = await response.json()

        if (response.ok) {
          setDateStats(result.dateStats || {})
        }
      } catch (error) {
        console.error('Error fetching date stats:', error)
      }
    }

    fetchDateStats()
  }, [selectedDate])

  const handleAttendanceUpdate = async (recordId: number, attended: boolean, skipDecrement = false) => {
    setLoading(true)
    try {
      const response = await fetch('/api/confirm-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, attended, skipDecrement }),
      })

      const result = await response.json()

      if (response.ok) {
        setRecords(prev =>
          prev.map(record =>
            record.id === recordId
              ? {
                ...record,
                attended,
                student: {
                  ...record.student,
                  remaining_classes: result.newRemainingClasses || record.student.remaining_classes
                }
              }
              : record
          )
        )
        setDialog(d => ({ ...d, open: false }))
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (type: 'confirm' | 'absence' | 'status-change', record: ClassRecordWithStudent, newStatus?: boolean) => {
    setDialog({
      open: true,
      type,
      recordId: record.id,
      studentName: record.student.name,
      currentStatus: record.attended,
      newStatus: newStatus ?? null,
    })
  }

  const handleDialogConfirm = () => {
    if (!dialog.recordId) return

    if (dialog.type === 'confirm') {
      handleAttendanceUpdate(dialog.recordId, true, false)
    } else if (dialog.type === 'absence') {
      handleAttendanceUpdate(dialog.recordId, false, true)
    } else if (dialog.type === 'status-change' && dialog.newStatus !== null) {
      const shouldDecrement = dialog.currentStatus === false && dialog.newStatus === true
      handleAttendanceUpdate(dialog.recordId, dialog.newStatus, !shouldDecrement)
    }
  }

  const pendingRecords = records.filter(r => r.attended === null)
  const processedRecords = records.filter(r => r.attended !== null)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
        <div className="flex gap-6">
          {/* Calendar Sidebar */}
          <div className="hidden md:block w-80 shrink-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  components={{
                    Day: ({ day, modifiers, ...props }) => {
                      const dateStr = dayjs(day.date).format('YYYY-MM-DD')
                      const stats = dateStats[dateStr]

                      let dotColor = ''
                      if (stats && stats.total > 0) {
                        const confirmedRecords = stats.completed + stats.absent
                        if (confirmedRecords > 0) {
                          const absentPercentage = (stats.absent / stats.total) * 100
                          if (absentPercentage >= 30) dotColor = 'bg-destructive'
                          else if (absentPercentage > 5) dotColor = 'bg-yellow-500'
                          else dotColor = 'bg-green-500'
                        }
                      }

                      const { onToggle, ...buttonProps } = props as Record<string, unknown>

                      return (
                        <div className="relative z-10">
                          <button
                            {...buttonProps}
                            onClick={() => setSelectedDate(day.date)}
                            className={`
                              relative h-8 w-8 p-0 font-normal rounded-md cursor-pointer text-sm
                              hover:bg-accent focus:bg-accent focus:outline-none
                              ${modifiers.selected
                                ? 'bg-primary text-primary-foreground hover:bg-primary'
                                : modifiers.today
                                  ? 'bg-accent font-semibold'
                                  : 'text-foreground'
                              }
                            `}
                          >
                            {day.date.getDate()}
                          </button>
                          {dotColor && (
                            <div className={`absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 ${dotColor} rounded-full z-20`} />
                          )}
                        </div>
                      )
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Mobile Date Selector */}
            <div className="md:hidden">
              <input
                type="date"
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                max={dayjs().format('YYYY-MM-DD')}
              />
            </div>

            {fetchLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Pending */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Pending
                        {pendingRecords.length > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {pendingRecords.length}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Confirm attendance deducts 1 class
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-0">
                    {pendingRecords.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No pending records
                      </p>
                    ) : (
                      <div className="divide-y">
                        {pendingRecords.map(record => (
                          <div key={record.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{record.student.name}</span>
                                <span className="text-xs text-muted-foreground">{record.student.remaining_classes} left</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {dayjs(record.class_date).format('HH:mm')}
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog('absence', record)}
                                disabled={loading}
                                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openDialog('confirm', record)}
                                disabled={loading}
                                className="h-7 text-xs"
                              >
                                Attended
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Processed */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Processed
                      {processedRecords.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {processedRecords.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click status to change
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-0">
                    {processedRecords.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No records yet
                      </p>
                    ) : (
                      <div className="divide-y">
                        {processedRecords.slice(0, 10).map(record => (
                          <div key={record.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors">
                            <div>
                              <span className="text-sm font-medium">{record.student.name}</span>
                              <div className="text-xs text-muted-foreground">
                                {dayjs(record.class_date).format('HH:mm')}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog('status-change', record, !record.attended)}
                              className={`h-7 text-xs ${
                                record.attended
                                  ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                  : 'text-destructive bg-red-50 hover:bg-red-100'
                              }`}
                            >
                              {record.attended ? 'Attended' : 'Absent'}
                            </Button>
                          </div>
                        ))}
                        {processedRecords.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            Showing 10 of {processedRecords.length}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialog.open} onOpenChange={(open) => setDialog(d => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog.type === 'confirm' && 'Confirm Attendance'}
              {dialog.type === 'absence' && 'Record Absence'}
              {dialog.type === 'status-change' && 'Change Status'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'confirm' && (
                <>Confirm attendance for <strong>{dialog.studentName}</strong>? This deducts 1 class.</>
              )}
              {dialog.type === 'absence' && (
                <>Record absence for <strong>{dialog.studentName}</strong>? No class will be deducted.</>
              )}
              {dialog.type === 'status-change' && (
                <>
                  Change <strong>{dialog.studentName}</strong> to{' '}
                  <strong>{dialog.newStatus ? 'Attended' : 'Absent'}</strong>?
                  {dialog.currentStatus === false && dialog.newStatus === true && (
                    <> This will deduct 1 class.</>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDialogConfirm}
              disabled={loading}
              className={
                dialog.type === 'absence' || (dialog.type === 'status-change' && !dialog.newStatus)
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {loading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
