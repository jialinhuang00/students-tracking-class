'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Navigation, Breadcrumb } from '@/components/navigation'
import { Send } from 'lucide-react'

import { BotInfo } from '@/lib/line'
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

export default function LineUsersPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string>('')
  const [testUserId, setTestUserId] = useState<string>('')
  const [testingStudentId, setTestingStudentId] = useState<number | null>(null)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string>('')
  const [updateLoading, setUpdateLoading] = useState<number | null>(null)
  const [showDecreaseDialog, setShowDecreaseDialog] = useState<{ show: boolean; studentId: number | null }>({ show: false, studentId: null })

  useEffect(() => {
    async function fetchData() {
      try {
        // Get all student data
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })

        if (studentsError) {
          console.error('Error fetching students:', studentsError)
        } else {
          setStudents(studentsData || [])
        }

        // Get LINE bot information
        const botResponse = await fetch('/api/line/bot-info')
        if (botResponse.ok) {
          const botData = await botResponse.json()
          setBotInfo(botData.data)
        } else {
          const error = await botResponse.json()
          setTestResult(`❌ LINE API connection failed: ${error.error}`)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setTestResult(`❌ Unable to connect to LINE API: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const testLineMessage = async (userId?: string, studentId?: number) => {
    const targetUserId = userId || testUserId.trim()

    if (!targetUserId) {
      setTestResult('❌ Please enter LINE User ID')
      return
    }

    setTestLoading(true)
    setTestResult('')
    if (studentId) {
      setTestingStudentId(studentId)
    }

    try {
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId,
          message: `Test message - This is a test message from the Coach Management System! Time: ${new Date().toLocaleString('zh-TW')}`
        }),
      })

      const result = await response.json()

      if (response.ok) {
        if (studentId) {
          const student = students.find(s => s.id === studentId)
          setTestResult(`✅ Successfully sent test message to ${student?.name}`)
        } else {
          setTestResult(`✅ Successfully sent test message to ${targetUserId}`)
        }
      } else {
        setTestResult(`❌ Send failed: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Send error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTestLoading(false)
      setTestingStudentId(null)
    }
  }

  const broadcastRegistration = async () => {
    setBroadcastLoading(true)
    setBroadcastResult('')

    try {
      const response = await fetch('/api/line/broadcast-registration', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        setBroadcastResult(`✅ ${result.message}`)
      } else {
        setBroadcastResult(`❌ Broadcast failed: ${result.error}`)
      }
    } catch (error) {
      setBroadcastResult(`❌ Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setBroadcastLoading(false)
    }
  }

  const updateStudentClasses = async (studentId: number, change: number) => {
    setUpdateLoading(studentId)

    try {
      const student = students.find(s => s.id === studentId)
      if (!student) return

      const newRemainingClasses = Math.max(0, student.remaining_classes + change)
      const newTotalClasses = change > 0 ? student.total_classes + change : student.total_classes

      const response = await fetch('/api/students/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          totalClasses: newTotalClasses,
          remainingClasses: newRemainingClasses
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Update local state
        setStudents(prev =>
          prev.map(s =>
            s.id === studentId
              ? {
                ...s,
                total_classes: newTotalClasses,
                remaining_classes: newRemainingClasses
              }
              : s
          )
        )
        setShowDecreaseDialog({ show: false, studentId: null })
      } else {
        alert('Update failed: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating student:', error)
      alert('Update error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUpdateLoading(null)
    }
  }

  const handleDecreaseClick = (studentId: number) => {
    const student = students.find(s => s.id === studentId)
    if (!student || student.remaining_classes <= 0) return

    setShowDecreaseDialog({ show: true, studentId })
  }

  const confirmDecrease = () => {
    if (showDecreaseDialog.studentId) {
      updateStudentClasses(showDecreaseDialog.studentId, -1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation />

      <div className="container mx-auto px-6 py-8">
        <Breadcrumb items={[{ label: 'LINE User Management' }]} />

        <div className="flex gap-6">
          {/* Left Sidebar - Bot Info, Broadcast, Test, Notes */}
          <div className="hidden md:block w-80 space-y-6">
            {/* LINE Bot Information */}
            {botInfo && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>LINE Official Account Information</CardTitle>
                  <CardDescription>Your LINE Bot basic information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    {botInfo.pictureUrl && (
                      <img
                        src={botInfo.pictureUrl}
                        alt="Bot Avatar"
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-medium">{botInfo.displayName}</h3>
                      <p className="text-sm text-muted-foreground">ID: {botInfo.basicId}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Chat mode: {botInfo.chatMode}</Badge>
                        <Badge variant="outline" className="text-xs">Read mode: {botInfo.markAsReadMode}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Broadcast Registration Message */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>📢 Broadcast Student Registration Message</CardTitle>
                <CardDescription>
                  Send registration instructions to all LINE official account followers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Broadcast content preview:</p>
                  <div className="text-xs text-gray-700 bg-white p-3 rounded border">
                    🏃‍♂️ Welcome to the Coach Management System!<br /><br />
                    Just send any message to us and you'll be automatically registered in the system!<br /><br />
                    System features:<br />
                    ✅ Automatic student profile creation<br />
                    ✅ Course reminder notifications<br />
                    ✅ Attendance tracking<br /><br />
                    Please send any message to start registration, for example: "Hello" or "Register"
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={broadcastRegistration}
                  disabled={broadcastLoading}
                  className="w-full"
                >
                  {broadcastLoading ? 'Broadcasting...' : 'Broadcast Registration Message'}
                </Button>

                {broadcastResult && (
                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm">{broadcastResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test LINE Messages */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Test LINE Message Sending</CardTitle>
                <CardDescription>
                  Enter a specific LINE User ID to test sending messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">LINE User ID</label>
                  <input
                    type="text"
                    value={testUserId}
                    onChange={(e) => setTestUserId(e.target.value)}
                    placeholder="e.g.: U1234567890abcdef..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => testLineMessage()}
                  disabled={testLoading || !testUserId.trim()}
                  className="w-full"
                >
                  {testLoading ? 'Sending...' : 'Send Test Message'}
                </Button>

                {testResult && (
                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm">{testResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>🔧 Setup Webhook</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p><strong>1. Set Webhook URL:</strong></p>
                  <p className="pl-4 font-mono text-xs bg-gray-100 p-2 rounded border">
                    https://mgm.jialin00.com/api/line/webhook
                  </p>
                  <p><strong>2. In LINE Developers Console:</strong></p>
                  <p>• Messaging API → Fill in the above URL in Webhook URL</p>
                  <p>• Enable "Use webhook"</p>
                  <p><strong>3. Simplified registration process:</strong></p>
                  <p>• Users add LINE friend and send any message</p>
                  <p>• System automatically gets LINE display name and adds student</p>
                  <p>• Coach can manage student class count on this page</p>
                  <p>• Send notifications by matching names with Google Calendar</p>
                </div>
              </CardContent>
            </Card>

            {/* LINE API Limitations */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>⚠️ LINE API Limitations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• <strong>Cannot get Followers</strong>: LINE removed the API to get followers list in 2019</p>
                  <p>• <strong>Passive user acquisition</strong>: Can only get User ID when users actively send messages</p>
                  <p>• <strong>Webhook required</strong>: Must set up Webhook URL to receive and process user messages</p>
                  <p>• <strong>Recommended approach</strong>: Let users send specific keywords to register after adding friend</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area - Users List */}
          <div className="flex-1">
            {/* Mobile - Collapsible Sidebar Content */}
            <div className="md:hidden space-y-4 mb-6">
              {/* LINE Bot Information */}
              {botInfo && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>LINE Official Account Information</CardTitle>
                    <CardDescription>Your LINE Bot basic information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      {botInfo.pictureUrl && (
                        <img
                          src={botInfo.pictureUrl}
                          alt="Bot Avatar"
                          className="w-16 h-16 rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{botInfo.displayName}</h3>
                        <p className="text-sm text-muted-foreground">ID: {botInfo.basicId}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">Chat mode: {botInfo.chatMode}</Badge>
                          <Badge variant="outline" className="text-xs">Read mode: {botInfo.markAsReadMode}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Broadcast Registration Message */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>📢 Broadcast Student Registration Message</CardTitle>
                  <CardDescription>
                    Send registration instructions to all LINE official account followers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Broadcast content preview:</p>
                    <div className="text-xs text-gray-700 bg-white p-3 rounded border">
                      🏃‍♂️ Welcome to the Coach Management System!<br /><br />
                      Just send any message to us and you'll be automatically registered in the system!<br /><br />
                      System features:<br />
                      ✅ Automatic student profile creation<br />
                      ✅ Course reminder notifications<br />
                      ✅ Attendance tracking<br /><br />
                      Please send any message to start registration, for example: "Hello" or "Register"
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={broadcastRegistration}
                    disabled={broadcastLoading}
                    className="w-full"
                  >
                    {broadcastLoading ? 'Broadcasting...' : 'Broadcast Registration Message'}
                  </Button>

                  {broadcastResult && (
                    <div className="p-3 rounded-md bg-gray-50 border">
                      <p className="text-sm">{broadcastResult}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test LINE Messages */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Test LINE Message Sending</CardTitle>
                  <CardDescription>
                    Enter a specific LINE User ID to test sending messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">LINE User ID</label>
                    <input
                      type="text"
                      value={testUserId}
                      onChange={(e) => setTestUserId(e.target.value)}
                      placeholder="e.g.: U1234567890abcdef..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => testLineMessage()}
                    disabled={testLoading || !testUserId.trim()}
                    className="w-full"
                  >
                    {testLoading ? 'Sending...' : 'Send Test Message'}
                  </Button>

                  {testResult && (
                    <div className="p-3 rounded-md bg-gray-50 border">
                      <p className="text-sm">{testResult}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Setup Instructions */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>🔧 Setup Webhook</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <p><strong>1. Set Webhook URL:</strong></p>
                    <p className="pl-4 font-mono text-xs bg-gray-100 p-2 rounded border">
                      https://mgm.jialin00.com/api/line/webhook
                    </p>
                    <p><strong>2. In LINE Developers Console:</strong></p>
                    <p>• Messaging API → Fill in the above URL in Webhook URL</p>
                    <p>• Enable "Use webhook"</p>
                    <p><strong>3. Simplified registration process:</strong></p>
                    <p>• Users add LINE friend and send any message</p>
                    <p>• System automatically gets LINE display name and adds student</p>
                    <p>• Coach can manage student class count on this page</p>
                    <p>• Send notifications by matching names with Google Calendar</p>
                  </div>
                </CardContent>
              </Card>

              {/* LINE API Limitations */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>⚠️ LINE API Limitations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• <strong>Cannot get Followers</strong>: LINE removed the API to get followers list in 2019</p>
                    <p>• <strong>Passive user acquisition</strong>: Can only get User ID when users actively send messages</p>
                    <p>• <strong>Webhook required</strong>: Must set up Webhook URL to receive and process user messages</p>
                    <p>• <strong>Recommended approach</strong>: Let users send specific keywords to register after adding friend</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      Student List
                      {students.length > 0 && (
                        <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                          {students.length} students
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      All student data, including LINE registration status
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mb-4"></div>
                    <p className="text-muted-foreground">Loading student data...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="rounded-full h-16 w-16 bg-gray-100 flex items-center justify-center mb-4">
                      <span className="text-2xl">👥</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">No student data</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Students will be automatically added to the system after adding LINE friend
                    </p>
                  </div>
                ) : (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {students.map((student) => (
                      <div key={student.id} className="px-4 py-2 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Student Information */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{student.name}</p>
                                {student.line_user_id && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200 shrink-0">
                                    LINE
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-xs text-gray-500">{student.phone || 'No phone'}</p>
                                {student.line_user_id && (
                                  <p className="text-xs text-gray-400 font-mono truncate max-w-32" title={student.line_user_id}>
                                    ID: {student.line_user_id.slice(0, 12)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Center: Class Management */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Remaining:</span>
                              <button
                                type="button"
                                onClick={() => handleDecreaseClick(student.id)}
                                disabled={updateLoading === student.id || student.remaining_classes <= 0}
                                className="w-6 h-6 rounded border hover:bg-red-50 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs text-red-600"
                                title="Use Class"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-medium text-sm">{student.remaining_classes}</span>
                              <button
                                type="button"
                                onClick={() => updateStudentClasses(student.id, 1)}
                                disabled={updateLoading === student.id}
                                className="w-6 h-6 rounded border hover:bg-green-50 hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs text-green-600"
                                title="Add Class"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Total:</span>
                              <span className="font-medium text-sm w-6 text-center">{student.total_classes}</span>
                            </div>
                          </div>

                          {/* Right: Send Button */}
                          <div className="shrink-0">
                            {student.line_user_id && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => testLineMessage(student.line_user_id!, student.id)}
                                disabled={testingStudentId === student.id}
                                className="px-2 py-1 h-7"
                                title="Send Test Message"
                              >
                                {testingStudentId === student.id ? (
                                  <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Class Deduction Confirmation Dialog */}
      {showDecreaseDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Class Usage</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to use a class for <strong>{students.find(s => s.id === showDecreaseDialog.studentId)?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This operation will reduce 1 remaining class, equivalent to completing one class record.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDecreaseDialog({ show: false, studentId: null })}
                disabled={updateLoading !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDecrease}
                disabled={updateLoading !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {updateLoading ? 'Processing...' : 'Confirm Class Usage'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}