import { NextRequest, NextResponse } from 'next/server'
import { sendLineMessage } from '@/lib/line'

export async function POST(request: NextRequest) {
  try {
    const { userId, message } = await request.json()
    
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing userId or message parameters' },
        { status: 400 }
      )
    }
    
    await sendLineMessage(userId, message)
    
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully'
    })
  } catch (error) {
    console.error('Error sending LINE message:', error)
    return NextResponse.json(
      { error: 'Failed to send LINE message: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}