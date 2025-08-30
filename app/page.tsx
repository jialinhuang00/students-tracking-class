'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/navigation'
import { Progress } from '@/components/ui/progress'
import { MultilingualGreeting } from '@/components/multilingual-greeting'

interface DashboardStats {
  notifications: {
    total: number
    completed: number
    percentage: number
  }
  attendance: {
    total: number
    completed: number
    percentage: number
  }
  classRecords: {
    total: number
    completed: number
    percentage: number
  }
}

interface TaskResult {
  type: 'notifications' | 'attendance' | 'classRecords'
  success: boolean
  title: string
  message: string
  details?: any
  show: boolean
}

export default function Home() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const [taskResult, setTaskResult] = useState<TaskResult>({
    type: 'notifications',
    success: false,
    title: '',
    message: '',
    details: null,
    show: false
  })

  // Fetch dashboard statistics
  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setStatsLoading(true)
        const response = await fetch('/api/dashboard/stats')
        const result = await response.json()

        if (response.ok) {
          setDashboardStats(result)
        } else {
          console.error('Error fetching dashboard stats:', result.error)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  // One-click complete notification sending
  const handleCompleteNotifications = async () => {
    setCompletingTask('notifications')
    try {
      const response = await fetch('/api/dashboard/complete-notifications', {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        // Refresh statistics data
        const statsResponse = await fetch('/api/dashboard/stats')
        const statsResult = await statsResponse.json()
        if (statsResponse.ok) {
          setDashboardStats(statsResult)
        }

        setTaskResult({
          type: 'notifications',
          success: true,
          title: 'Course Notification Sent Successfully',
          message: result.message,
          details: result.details,
          show: true
        })
      } else {
        setTaskResult({
          type: 'notifications',
          success: false,
          title: 'Course Notification Failed',
          message: result.error || 'Failed to send notification',
          details: null,
          show: true
        })
      }
    } catch (error) {
      console.error('Error completing notifications:', error)
      setTaskResult({
        type: 'notifications',
        success: false,
        title: 'Course Notification Failed',
        message: 'Error occurred while sending notification',
        details: null,
        show: true
      })
    } finally {
      setCompletingTask(null)
    }
  }

  // One-click complete attendance confirmation
  const handleCompleteAttendance = async () => {
    setCompletingTask('attendance')
    try {
      const response = await fetch('/api/dashboard/complete-attendance', {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        // Refresh statistics data
        const statsResponse = await fetch('/api/dashboard/stats')
        const statsResult = await statsResponse.json()
        if (statsResponse.ok) {
          setDashboardStats(statsResult)
        }

        setTaskResult({
          type: 'attendance',
          success: true,
          title: 'Attendance Record Confirmation Completed',
          message: result.message,
          details: result,
          show: true
        })
      } else {
        setTaskResult({
          type: 'attendance',
          success: false,
          title: 'Attendance Record Confirmation Failed',
          message: result.error || 'Failed to confirm attendance',
          details: null,
          show: true
        })
      }
    } catch (error) {
      console.error('Error completing attendance:', error)
      setTaskResult({
        type: 'attendance',
        success: false,
        title: 'Attendance Record Confirmation Failed',
        message: 'Error occurred while confirming attendance',
        details: null,
        show: true
      })
    } finally {
      setCompletingTask(null)
    }
  }

  // One-click complete class records creation
  const handleCompleteClassRecords = async () => {
    setCompletingTask('classRecords')
    try {
      const response = await fetch('/api/dashboard/complete-class-records', {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        // Refresh statistics data
        const statsResponse = await fetch('/api/dashboard/stats')
        const statsResult = await statsResponse.json()
        if (statsResponse.ok) {
          setDashboardStats(statsResult)
        }

        setTaskResult({
          type: 'classRecords',
          success: true,
          title: 'Class Records Created Successfully',
          message: result.message,
          details: result.details,
          show: true
        })
      } else {
        setTaskResult({
          type: 'classRecords',
          success: false,
          title: 'Class Records Creation Failed',
          message: result.error || 'Failed to create class records',
          details: null,
          show: true
        })
      }
    } catch (error) {
      console.error('Error completing class records:', error)
      setTaskResult({
        type: 'classRecords',
        success: false,
        title: 'Class Records Creation Failed',
        message: 'Error occurred while creating class records',
        details: null,
        show: true
      })
    } finally {
      setCompletingTask(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation />


      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Greeting and Navigation */}
          <div className="hidden md:block w-80 mb-6">
            {/* Multilingual Greeting Card */}
            <MultilingualGreeting className="mb-6" />

            {/* Navigation Menu Card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Function Menu</CardTitle>
                <CardDescription>Select function to use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <Link href="/notifications" className="w-full block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <div className="text-left">
                        <div className="font-medium text-sm">Course Notifications</div>
                        <div className="text-xs text-muted-foreground">Send LINE notifications</div>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Link href="/attendance" className="w-full block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3 hover:bg-green-50 hover:text-green-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <div className="text-left">
                        <div className="font-medium text-sm">Class Management</div>
                        <div className="text-xs text-muted-foreground">Confirm attendance status</div>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Link href="/line-users" className="w-full block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      <div className="text-left">
                        <div className="font-medium text-sm">LINE Users</div>
                        <div className="text-xs text-muted-foreground">Student management</div>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 hover:bg-orange-50 hover:text-orange-700"
                  disabled
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                    <div className="text-left">
                      <div className="font-medium text-sm">Coaches</div>
                      <div className="text-xs text-muted-foreground">Coach management</div>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 space-y-6">
            {/* Task Card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">📋 Tasks</CardTitle>
                <CardDescription>Check course notification and attendance record completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {statsLoading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
                    <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
                  </div>
                ) : dashboardStats ? (
                  <>
                    {/* Tomorrow's Course Notification Status */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-sm">Tomorrow's Course Notification Status</h4>
                          <p className="text-xs text-muted-foreground">
                            {dashboardStats.notifications.completed} / {dashboardStats.notifications.total} notifications sent
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{dashboardStats.notifications.percentage}%</span>
                        </div>
                      </div>
                      <Progress
                        value={dashboardStats.notifications.percentage}
                        className="h-2"
                        animated={dashboardStats.notifications.percentage > 0 && dashboardStats.notifications.percentage < 100}
                      />
                      {dashboardStats.notifications.total > 0 && dashboardStats.notifications.percentage < 100 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-orange-600">
                            ⚠️ {dashboardStats.notifications.total - dashboardStats.notifications.completed} classes still need notifications
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1"
                            onClick={handleCompleteNotifications}
                            disabled={completingTask === 'notifications'}
                          >
                            {completingTask === 'notifications' ? 'Processing...' : 'Complete All'}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-6">
                      {/* Recent Attendance Record Confirmation Status */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-sm">
                              Attendance Record Confirmation ({dayjs().subtract(2, 'day').format('M/D')} ~ {dayjs().format('M/D')})
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {dashboardStats.attendance.completed} / {dashboardStats.attendance.total} attendance confirmed
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold">{dashboardStats.attendance.percentage}%</span>
                          </div>
                        </div>
                        <Progress
                          value={dashboardStats.attendance.percentage}
                          className="h-2"
                          animated={dashboardStats.attendance.percentage > 0 && dashboardStats.attendance.percentage < 100}
                        />
                        {dashboardStats.attendance.total > 0 && dashboardStats.attendance.percentage < 100 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-orange-600">
                              ⚠️ {dashboardStats.attendance.total - dashboardStats.attendance.completed} records awaiting confirmation
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-2 py-1"
                              onClick={handleCompleteAttendance}
                              disabled={completingTask === 'attendance'}
                            >
                              {completingTask === 'attendance' ? 'Processing...' : 'Everyone attended, complete all'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      {/* Class Records Creation Status */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-sm">Tomorrow's Schedule Class Records Creation</h4>
                            <p className="text-xs text-muted-foreground">
                              {dashboardStats.classRecords.completed} / {dashboardStats.classRecords.total} class records created
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold">{dashboardStats.classRecords.percentage}%</span>
                          </div>
                        </div>
                        <Progress
                          value={dashboardStats.classRecords.percentage}
                          className="h-2"
                          animated={dashboardStats.classRecords.percentage > 0 && dashboardStats.classRecords.percentage < 100}
                        />
                        {dashboardStats.classRecords.total > 0 && dashboardStats.classRecords.percentage < 100 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-orange-600">
                              ⚠️ {dashboardStats.classRecords.total - dashboardStats.classRecords.completed} schedules need records created
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-2 py-1"
                              onClick={handleCompleteClassRecords}
                              disabled={completingTask === 'classRecords'}
                            >
                              {completingTask === 'classRecords' ? 'Processing...' : 'Complete All'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-3xl mb-3">⚠️</div>
                    <p>Unable to load statistics</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Task Result Dialog */}
      {taskResult.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${taskResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                <span className="text-lg">
                  {taskResult.success ? '✅' : '❌'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {taskResult.title}
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              {taskResult.message}
            </p>

            {/* Detailed Results */}
            {taskResult.success && taskResult.details && (
              <div className="space-y-4">
                {/* Notification Sending Results */}
                {taskResult.type === 'notifications' && taskResult.details.summary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-3">📧 Sending Results</h4>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {taskResult.details.summary.total_events}
                        </div>
                        <div className="text-xs text-gray-500">Total Classes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {taskResult.details.summary.notifications_sent}
                        </div>
                        <div className="text-xs text-gray-500">Successfully Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {taskResult.details.summary.notifications_failed}
                        </div>
                        <div className="text-xs text-gray-500">Failed to Send</div>
                      </div>
                    </div>

                    {taskResult.details.summary.sent_students?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-green-700 mb-1">
                          ✅ Successfully Sent ({taskResult.details.summary.sent_students.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {taskResult.details.summary.sent_students.map((student: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {student}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {taskResult.details.summary.failed_students?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-1">
                          ❌ Failed to Send ({taskResult.details.summary.failed_students.length})
                        </p>
                        <div className="space-y-1">
                          {taskResult.details.summary.failed_students.map((student: any, index: number) => (
                            <div key={index} className="px-2 py-1 bg-red-50 text-red-800 text-xs rounded">
                              {student.name}: {student.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attendance Confirmation Results */}
                {taskResult.type === 'attendance' && taskResult.details.summary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-3">✅ Attendance Confirmation Results</h4>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Batch confirmed <span className="font-bold text-green-600">{taskResult.details.updated}</span> attendance records as attended
                      </p>
                    </div>

                    {/* Show confirmed students by date */}
                    {taskResult.details.summary.attendance_by_date && Object.keys(taskResult.details.summary.attendance_by_date).length > 0 && (
                      <div className="space-y-3">
                        {Object.entries(taskResult.details.summary.attendance_by_date).map(([date, students]) => (
                          <div key={date}>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              📅 {date} ({(students as string[]).length} students)
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(students as string[]).map((student, index) => (
                                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  {student}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Class Records Creation Results */}
                {taskResult.type === 'classRecords' && taskResult.details.summary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-3">📝 Class Records Results</h4>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {taskResult.details.summary.total_events}
                        </div>
                        <div className="text-xs text-gray-500">Total Classes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {taskResult.details.summary.records_created}
                        </div>
                        <div className="text-xs text-gray-500">Records Created</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {taskResult.details.summary.records_skipped}
                        </div>
                        <div className="text-xs text-gray-500">Already Existed</div>
                      </div>
                    </div>

                    {taskResult.details.summary.created_students?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-green-700 mb-1">
                          ✅ Records Created ({taskResult.details.summary.created_students.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {taskResult.details.summary.created_students.map((student: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {student}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {taskResult.details.summary.skipped_students?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-yellow-700 mb-1">
                          ⏭️ Records Already Existed ({taskResult.details.summary.skipped_students.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {taskResult.details.summary.skipped_students.map((student: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              {student}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {taskResult.details.summary.failed_students?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-1">
                          ❌ Creation Failed ({taskResult.details.summary.failed_students.length})
                        </p>
                        <div className="space-y-1">
                          {taskResult.details.summary.failed_students.map((student: any, index: number) => (
                            <div key={index} className="px-2 py-1 bg-red-50 text-red-800 text-xs rounded">
                              {student.name}: {student.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setTaskResult(prev => ({ ...prev, show: false }))}
                className="px-4 py-2"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}