'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Navigation, Breadcrumb } from '@/components/navigation'
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
  const [showStatusDialog, setShowStatusDialog] = useState<{
    show: boolean;
    recordId: number | null;
    studentName: string;
    currentStatus: boolean | null;
    newStatus: boolean | null;
  }>({ show: false, recordId: null, studentName: '', currentStatus: null, newStatus: null })

  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    show: boolean;
    type: 'attend' | 'absence';
    recordId: number | null;
    studentName: string;
  }>({ show: false, type: 'attend', recordId: null, studentName: '' })

  // Fetch class records from Supabase
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
          .gte('class_date', dayjs(selectedDate).startOf('day').toISOString())
          .lt('class_date', dayjs(selectedDate).add(1, 'day').startOf('day').toISOString())
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

  // Fetch date stats for calendar badges
  useEffect(() => {
    async function fetchDateStats() {
      try {
        // Get the start and end dates of the current month, extending one month forward and backward to cover the entire visible range
        const startDate = dayjs(selectedDate).subtract(2, 'month').startOf('month').toISOString()
        const endDate = dayjs(selectedDate).add(2, 'month').endOf('month').toISOString()

        const response = await fetch(`/api/class-records/count?startDate=${startDate}&endDate=${endDate}`)
        const result = await response.json()

        if (response.ok) {
          setDateStats(result.dateStats || {})
        } else {
          console.error('Error fetching date stats:', result.error)
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: recordId,
          attended: attended,
          skipDecrement: skipDecrement
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Update local state
        setRecords(prev =>
          prev.map(record =>
            record.id === recordId
              ? {
                ...record,
                attended: attended,
                student: {
                  ...record.student,
                  remaining_classes: result.newRemainingClasses || record.student.remaining_classes
                }
              }
              : record
          )
        )

        setShowStatusDialog({ show: false, recordId: null, studentName: '', currentStatus: null, newStatus: null })
        setShowConfirmDialog({ show: false, type: 'attend', recordId: null, studentName: '' })
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      // Error will be handled in catch, no need for alert
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceConfirm = (recordId: number, studentName: string) => {
    setShowConfirmDialog({
      show: true,
      type: 'attend',
      recordId,
      studentName
    })
  }

  const handleAttendanceAbsence = (recordId: number, studentName: string) => {
    setShowConfirmDialog({
      show: true,
      type: 'absence',
      recordId,
      studentName
    })
  }

  const confirmAction = () => {
    if (showConfirmDialog.recordId) {
      if (showConfirmDialog.type === 'attend') {
        handleAttendanceUpdate(showConfirmDialog.recordId, true, false)
      } else {
        handleAttendanceUpdate(showConfirmDialog.recordId, false, true)
      }
    }
  }

  const handleStatusChange = (record: ClassRecordWithStudent, newStatus: boolean) => {
    setShowStatusDialog({
      show: true,
      recordId: record.id,
      studentName: record.student.name,
      currentStatus: record.attended,
      newStatus: newStatus
    })
  }

  const confirmStatusChange = () => {
    if (showStatusDialog.recordId && showStatusDialog.newStatus !== null) {
      // If changing from absent to attended, need to deduct classes
      // If changing from attended to absent, don't deduct classes (because already deducted)
      const shouldDecrement = showStatusDialog.currentStatus === false && showStatusDialog.newStatus === true
      handleAttendanceUpdate(showStatusDialog.recordId, showStatusDialog.newStatus, !shouldDecrement)
    }
  }

  const pendingRecords = records.filter(record => record.attended === null)
  const processedRecords = records.filter(record => record.attended !== null)

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Breadcrumb items={[{ label: 'Class Management' }]} />

        <div className="flex gap-6">
          {/* Calendar Sidebar */}
          <div className="hidden md:block w-80">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Select Date</CardTitle>
                <CardDescription>Choose the date to view</CardDescription>
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

                      // Determine dot color logic (based on absence ratio, excluding null):
                      // Red: absence ratio >= 30%
                      // Yellow: absence ratio < 30% and > 5%
                      // Green: absence ratio <= 5%
                      let dotColor = ''
                      if (stats && stats.total > 0) {
                        // Calculate non-null record count (confirmed attendance or absence records)
                        const confirmedRecords = stats.completed + stats.absent
                        if (confirmedRecords > 0) {
                          // Calculate absence ratio (only count non-null records)
                          const absentPercentage = (stats.absent / stats.total) * 100
                          console.log(dateStr, stats, absentPercentage)

                          if (absentPercentage >= 30) {
                            dotColor = 'bg-red-500'
                          } else if (absentPercentage > 5) {
                            dotColor = 'bg-yellow-500'
                          } else {
                            dotColor = 'bg-green-500'
                          }
                        }
                      }

                      // Filter out incompatible props for button element
                      const { onToggle, ...buttonProps } = props as any

                      return (
                        <div className="relative z-10">
                          <button
                            {...buttonProps}
                            onClick={() => setSelectedDate(day.date)}
                            className={`
                              relative h-8 w-8 p-0 font-normal rounded-md cursor-pointer text-sm
                              hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                              ${modifiers.selected
                                ? 'bg-blue-600 text-white hover:bg-blue-600'
                                : modifiers.today
                                  ? 'bg-gray-100 font-semibold'
                                  : 'text-gray-900'
                              }
                            `}
                          >
                            {day.date.getDate()}
                          </button>
                          {dotColor && (
                            <div className={`absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-2 h-2 ${dotColor} rounded-full z-20`}></div>
                          )}
                        </div>
                      )
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">{/* Mobile Date Selector */}
            <div className="md:hidden mb-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={dayjs(selectedDate).format('YYYY-MM-DD')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    max={dayjs().format('YYYY-MM-DD')}
                  />
                </CardContent>
              </Card>
            </div>
            {fetchLoading ? (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-muted-foreground">Loading class records...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Pending Attendance Confirmation */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          Pending Attendance Confirmation
                          {pendingRecords.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {pendingRecords.length} pending
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Clicking "Confirm Attendance" will deduct one class from the student
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-0">
                    {pendingRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="rounded-full h-16 w-16 bg-green-100 flex items-center justify-center mb-4">
                          <span className="text-2xl">🎉</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">Excellent!</h3>
                        <p className="text-sm text-muted-foreground text-center">
                          Currently no pending attendance records
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {pendingRecords.map((record) => (
                          <div key={record.id} className="px-6 py-3 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm">{record.student.name}</h4>
                                    <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                                      {record.student.remaining_classes} classes
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <p className="text-xs text-gray-500">{record.student.phone}</p>
                                    <span className="text-xs text-gray-400">
                                      {dayjs(record.class_date).format('M/D HH:mm')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right side: Action buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAttendanceAbsence(record.id, record.student.name)}
                                  disabled={loading}
                                  className="text-xs px-3 py-1 h-7 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Mark Absent
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAttendanceConfirm(record.id, record.student.name)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 h-7"
                                >
                                  Confirm Attendance
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Processed Records */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          Processed
                          {processedRecords.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {processedRecords.length} records
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Click status to modify attendance record
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-0">
                    {processedRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="rounded-full h-16 w-16 bg-gray-100 flex items-center justify-center mb-4">
                          <span className="text-2xl">📋</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">No Records</h3>
                        <p className="text-sm text-muted-foreground text-center">
                          No processed attendance records yet
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {processedRecords.slice(0, 10).map((record) => (
                          <div key={record.id} className="px-6 py-3 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              {/* 左側：學生資訊 */}
                              <div className="flex items-center gap-4 flex-1">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm">{record.student.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <p className="text-xs text-gray-500">{record.student.phone}</p>
                                    <span className="text-xs text-gray-400">
                                      {dayjs(record.class_date).format('M/D HH:mm')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right side: Status button (clickable to modify) */}
                              <div className="shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(record, !record.attended)}
                                  className={`text-xs px-3 py-1 h-7 cursor-pointer ${record.attended
                                    ? 'text-green-800 bg-green-100 border-green-200 hover:bg-green-200'
                                    : 'text-red-800 bg-red-100 border-red-200 hover:bg-red-200'
                                    }`}
                                >
                                  {record.attended ? 'Attended' : 'Absent'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {processedRecords.length > 10 && (
                          <div className="px-6 py-4 border-t bg-gray-50/50">
                            <p className="text-sm text-muted-foreground text-center">
                              Showing latest 10 records, {processedRecords.length} total
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Confirmation Dialog */}
      {showStatusDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Modification</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to change <strong>{showStatusDialog.studentName}</strong>'s status to
              <strong className={showStatusDialog.newStatus ? 'text-green-600' : 'text-red-600'}>
                {showStatusDialog.newStatus ? 'Attended' : 'Absent'}
              </strong>?
            </p>
            {showStatusDialog.currentStatus === false && showStatusDialog.newStatus === true && (
              <p className="text-sm text-orange-600 mb-4">
                ⚠️ Changing from absent to attended will deduct 1 class
              </p>
            )}
            {showStatusDialog.currentStatus === true && showStatusDialog.newStatus === false && (
              <p className="text-sm text-gray-500 mb-4">
                Changing from attended to absent won't add classes (already deducted)
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowStatusDialog({ show: false, recordId: null, studentName: '', currentStatus: null, newStatus: null })}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmStatusChange}
                disabled={loading}
                className={showStatusDialog.newStatus ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {loading ? 'Processing...' : 'Confirm Change'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Attendance Confirmation Dialog */}
      {showConfirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {showConfirmDialog.type === 'attend' ? 'Confirm Attendance' : 'Record Absence'}
            </h3>
            <p className="text-gray-600 mb-4">
              {showConfirmDialog.type === 'attend' ? (
                <>
                  Are you sure you want to confirm attendance and deduct a class for <strong>{showConfirmDialog.studentName}</strong>?
                  <br />
                  <span className="text-sm text-red-600">This will deduct 1 class.</span>
                </>
              ) : (
                <>
                  Are you sure you want to record absence for <strong>{showConfirmDialog.studentName}</strong>?
                  <br />
                  <span className="text-sm text-gray-500">This will not deduct a class.</span>
                </>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmDialog({ show: false, type: 'attend', recordId: null, studentName: '' })}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmAction}
                disabled={loading}
                className={showConfirmDialog.type === 'attend'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
                }
              >
                {loading ? 'Processing...' : showConfirmDialog.type === 'attend' ? 'Confirm Attendance' : 'Record Absence'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}