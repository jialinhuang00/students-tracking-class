'use client'

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  const [showDecreaseDialog, setShowDecreaseDialog] = useState<{ show: boolean; studentId: number | null }>({ show: false, studentId: null })

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

  // Fetch recent records for selected student
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
        setShowDecreaseDialog({ show: false, studentId: null })
      }
    } catch (error) {
      console.error('Error updating student:', error)
    } finally {
      setUpdateLoading(null)
    }
  }

  const handleDecrease = (studentId: number) => {
    const student = students.find(s => s.id === studentId)
    if (!student || student.remaining_classes <= 0) return
    setShowDecreaseDialog({ show: true, studentId })
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
          message: `Test message - Coach Management System! Time: ${new Date().toLocaleString('zh-TW')}`
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
    <div className="min-h-screen bg-gray-50/30">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-lg font-semibold mb-4">
          Students <span className="text-sm font-normal text-gray-400">({students.length})</span>
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
          </div>
        ) : (
          <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
            {/* Left: Student List */}
            <div className="w-72 bg-white rounded-xl border overflow-hidden flex flex-col shrink-0">
              <div className="p-3 border-b">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No students found</div>
                ) : (
                  filtered.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedId(student.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedId === student.id
                          ? 'bg-blue-50 border-l-2 border-blue-600'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{student.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          student.line_user_id ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">{student.phone || 'No phone'}</span>
                        <span className={`text-xs font-medium ${
                          student.remaining_classes === 0
                            ? 'text-red-600'
                            : student.remaining_classes <= 2
                              ? 'text-orange-600'
                              : ''
                        }`}>
                          {student.remaining_classes} left
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: Detail */}
            <div className="flex-1 bg-white rounded-xl border p-6 overflow-y-auto">
              {selectedStudent ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                      <p className="text-sm text-gray-400">{selectedStudent.phone || 'No phone'}</p>
                    </div>
                    {selectedStudent.line_user_id ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">LINE connected</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">No LINE</Badge>
                    )}
                  </div>

                  {/* Class Balance */}
                  <div className="bg-gray-50 rounded-xl p-5 mb-6">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Class Balance</div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecrease(selectedStudent.id)}
                          disabled={updateLoading === selectedStudent.id || selectedStudent.remaining_classes <= 0}
                          className="w-10 h-10 rounded-xl border-2 text-red-500 hover:bg-red-50 text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <div className="text-center min-w-[3rem]">
                          <div className={`text-3xl font-bold ${
                            selectedStudent.remaining_classes === 0
                              ? 'text-red-600'
                              : selectedStudent.remaining_classes <= 2
                                ? 'text-orange-600'
                                : ''
                          }`}>
                            {selectedStudent.remaining_classes}
                          </div>
                          <div className="text-xs text-gray-400">remaining</div>
                        </div>
                        <button
                          onClick={() => updateClasses(selectedStudent.id, 1)}
                          disabled={updateLoading === selectedStudent.id}
                          className="w-10 h-10 rounded-xl border-2 text-green-500 hover:bg-green-50 text-xl font-bold disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-gray-300">|</div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-400">{selectedStudent.total_classes}</div>
                        <div className="text-xs text-gray-400">total</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Classes */}
                  <div className="mb-6">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent Classes</div>
                    {recordsLoading ? (
                      <div className="py-4 text-center text-sm text-gray-400">Loading...</div>
                    ) : recentRecords.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-400">No class records yet</div>
                    ) : (
                      <div className="space-y-1">
                        {recentRecords.map(record => (
                          <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm">{dayjs(record.class_date).format('M/D HH:mm')}</span>
                            {record.attended === null ? (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Pending</span>
                            ) : record.attended ? (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Attended</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Absent</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {selectedStudent.line_user_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMessage(selectedStudent)}
                        disabled={testingId === selectedStudent.id}
                        className="text-xs"
                      >
                        {testingId === selectedStudent.id ? 'Sending...' : 'Send test message'}
                      </Button>
                    )}
                  </div>

                  {testResult && (
                    <p className="mt-2 text-xs text-gray-500">{testResult}</p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Select a student
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Decrease Confirmation Dialog */}
      {showDecreaseDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Class Usage</h3>
            <p className="text-gray-600 mb-4">
              Use a class for <strong>{students.find(s => s.id === showDecreaseDialog.studentId)?.name}</strong>?
              This will reduce 1 remaining class.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDecreaseDialog({ show: false, studentId: null })}
                disabled={updateLoading !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={() => showDecreaseDialog.studentId && updateClasses(showDecreaseDialog.studentId, -1)}
                disabled={updateLoading !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {updateLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
