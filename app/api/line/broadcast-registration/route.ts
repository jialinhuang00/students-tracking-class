import { NextResponse } from 'next/server'
import { sendLineBroadcast } from '@/lib/line'

export async function POST() {
  try {
    const registrationMessage = `Welcome to ClassNudge!

Just send us any message and you'll be automatically registered in the system!

System features:
✅ Automatically create student profiles
✅ Course reminder notifications
✅ Attendance tracking

Please send any message to start registration, for example:
"Hello" or "Register"

After registration, coaches will schedule classes for you and send notifications.`

    await sendLineBroadcast(registrationMessage)
    
    return NextResponse.json({
      success: true,
      message: 'Registration message broadcast to all followers'
    })
  } catch (error) {
    console.error('Error sending broadcast:', error)
    return NextResponse.json(
      { error: 'Broadcast message failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}