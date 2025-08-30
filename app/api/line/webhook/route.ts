import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { sendLineMessage, getLineUserProfile } from '@/lib/line'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!

interface LineWebhookEvent {
  type: string
  message?: {
    type: string
    text: string
  }
  source: {
    type: string
    userId: string
  }
  replyToken: string
}

interface LineWebhookBody {
  events: LineWebhookEvent[]
}

// Verify LINE Webhook signature
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')

  return signature === hash
}

// Auto-register new user
async function registerNewUser(userId: string) {
  try {
    // Check if user already exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('*')
      .eq('line_user_id', userId)
      .single()

    //     if (existingStudent) {
    //       // User already exists, send welcome back message
    //       await sendLineMessage(userId, `Welcome back, ${existingStudent.name}!

    // Your information:
    // • Remaining classes: ${existingStudent.remaining_classes} sessions
    // • Total classes: ${existingStudent.total_classes} sessions

    // Please contact your coach if you need to update your information.`)
    //       return
    //     }

    // Get user LINE profile
    const userProfile = await getLineUserProfile(userId)

    // Add to students table
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert({
        name: userProfile.displayName,
        line_user_id: userId,
        total_classes: 0,
        remaining_classes: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating student:', insertError)
      await sendLineMessage(userId, '❌ Registration failed, please try again later or contact your coach.')
      return
    }

    // Send welcome message
    await sendLineMessage(userId, `🎉 Welcome to the Coach Management System!

Your profile has been created:
• Name: ${userProfile.displayName}
• Student ID: ${newStudent.id}

Your coach will schedule classes for you and you will receive class reminder notifications.

If you need to update your name, phone, or other information, please contact your coach.`)

  } catch (error) {
    console.error('Error in auto registration:', error)
    await sendLineMessage(userId, '❌ System error, please try again later or contact your coach.')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    if (!signature || !verifySignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const webhookBody: LineWebhookBody = JSON.parse(body)
    console.log('Webhook received:', JSON.stringify(webhookBody, null, 2))

    for (const event of webhookBody.events) {
      if (event.type === 'message' && event.message?.type === 'text') {
        const userId = event.source.userId
        const messageText = event.message.text

        console.log(`Received message from ${userId}: ${messageText}`)

        // Auto-register new user (regardless of message content)
        await registerNewUser(userId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}