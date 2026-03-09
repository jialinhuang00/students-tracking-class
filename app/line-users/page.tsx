'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

interface Student {
  id: number
  name: string
  phone?: string
  line_user_id?: string
  total_classes: number
  remaining_classes: number
  created_at: string
  updated_at: string
}

interface ClassRecord {
  id: number
  class_date: string
  attended: boolean | null
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [updateLoading, setUpdateLoading] = useState<number | null>(null)
  const [recentRecords, setRecentRecords] = useState<ClassRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [testResult, setTestResult] = useState('')
  const [decreaseDialog, setDecreaseDialog] = useState(false)

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setStudents(data)
          if (data.length > 0 && !selectedId) {
            setSelectedId(data[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  useEffect(() => {
    if (!selectedId) return

    async function fetchRecords() {
      setRecordsLoading(true)
      try {
        const { data, error } = await supabase
          .from('class_records')
          .select('id, class_date, attended')
          .eq('student_id', selectedId)
          .order('class_date', { ascending: false })
          .limit(10)

        if (!error && data) {
          setRecentRecords(data)
        }
      } catch (error) {
        console.error('Error fetching records:', error)
      } finally {
        setRecordsLoading(false)
      }
    }

    fetchRecords()
  }, [selectedId])

  const selectedStudent = students.find(s => s.id === selectedId)

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  )

  const updateClasses = async (studentId: number, change: number) => {
    setUpdateLoading(studentId)
    try {
      const student = students.find(s => s.id === studentId)
      if (!student) return

      const newRemaining = Math.max(0, student.remaining_classes + change)
      const newTotal = change > 0 ? student.total_classes + change : student.total_classes

      const response = await fetch('/api/students/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          totalClasses: newTotal,
          remainingClasses: newRemaining
        }),
      })

      if (response.ok) {
        setStudents(prev =>
          prev.map(s =>
            s.id === studentId
              ? { ...s, total_classes: newTotal, remaining_classes: newRemaining }
              : s
          )
        )
        setDecreaseDialog(false)
      }
    } catch (error) {
      console.error('Error updating student:', error)
    } finally {
      setUpdateLoading(null)
    }
  }

  const testMessage = async (student: Student) => {
    if (!student.line_user_id) return
    setTestingId(student.id)
    setTestResult('')
    try {
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: student.line_user_id,
          message: `Test message - ClassNudge! Time: ${new Date().toLocaleString('zh-TW')}`
        }),
      })
      setTestResult(response.ok ? `Sent to ${student.name}` : 'Send failed')
    } catch {
      setTestResult('Send error')
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="flex gap-4" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Left: Student List */}
            <div className="w-1/2 border rounded-lg overflow-hidden flex flex-col bg-background">
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">No students found</p>
                ) : (
                  filtered.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedId(student.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors border-b last:border-0 ${
                        selectedId === student.id
                          ? 'bg-accent'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{student.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs ${
                            student.remaining_classes === 0
                              ? 'text-destructive'
                              : student.remaining_classes <= 2
                                ? 'text-orange-600'
                                : 'text-muted-foreground'
                          }`}>
                            {student.remaining_classes}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            student.line_user_id ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="px-3 py-2 border-t text-xs text-muted-foreground">
                {students.length} students
              </div>
            </div>

            {/* Right: Detail */}
            <div className="w-1/2 border rounded-lg overflow-y-auto bg-background">
              {selectedStudent ? (
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">{selectedStudent.name}</h2>
                      {selectedStudent.line_user_id ? (
                        <Badge variant="secondary" className="text-green-700 bg-green-50 text-xs">LINE</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">No LINE</Badge>
                      )}
                    </div>
                    {selectedStudent.line_user_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMessage(selectedStudent)}
                        disabled={testingId === selectedStudent.id}
                        className="text-xs h-7"
                      >
                        {testingId === selectedStudent.id ? 'Sending...' : 'Test message'}
                      </Button>
                    )}
                  </div>
                  {testResult && (
                    <p className="mt-1 text-xs text-muted-foreground">{testResult}</p>
                  )}

                  <Separator className="my-4" />

                  {/* Class balance — inline */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide w-20">Balance</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedStudent.remaining_classes > 0 && setDecreaseDialog(true)}
                        disabled={updateLoading === selectedStudent.id || selectedStudent.remaining_classes <= 0}
                        className="h-7 w-7 p-0 text-destructive"
                      >
                        -
                      </Button>
                      <span className={`text-lg font-bold tabular-nums min-w-[2rem] text-center ${
                        selectedStudent.remaining_classes === 0
                          ? 'text-destructive'
                          : selectedStudent.remaining_classes <= 2
                            ? 'text-orange-600'
                            : ''
                      }`}>
                        {selectedStudent.remaining_classes}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateClasses(selectedStudent.id, 1)}
                        disabled={updateLoading === selectedStudent.id}
                        className="h-7 w-7 p-0 text-green-600"
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">/ {selectedStudent.total_classes} total</span>
                  </div>

                  <Separator className="my-4" />

                  {/* Recent classes — compact */}
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Recent Classes</span>
                    {recordsLoading ? (
                      <p className="text-sm text-muted-foreground mt-2">Loading...</p>
                    ) : recentRecords.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">No records</p>
                    ) : (
                      <div className="mt-2 space-y-0.5">
                        {recentRecords.map(record => (
                          <div key={record.id} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-foreground">{dayjs(record.class_date).format('M/D HH:mm')}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                record.attended === null
                                  ? 'text-muted-foreground'
                                  : record.attended
                                    ? 'text-green-700 border-green-200'
                                    : 'text-destructive border-red-200'
                              }`}
                            >
                              {record.attended === null ? 'Pending' : record.attended ? 'Attended' : 'Absent'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select a student
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Decrease Confirmation */}
      <AlertDialog open={decreaseDialog} onOpenChange={setDecreaseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use a class?</AlertDialogTitle>
            <AlertDialogDescription>
              This deducts 1 class from <strong>{selectedStudent?.name}</strong>.
              Remaining: {selectedStudent?.remaining_classes} → {(selectedStudent?.remaining_classes || 0) - 1}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedStudent && updateClasses(selectedStudent.id, -1)}
              disabled={updateLoading !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {updateLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
