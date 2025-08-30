import { NextResponse } from 'next/server'
import { getLineBotInfo } from '@/lib/line'

export async function GET() {
  try {
    const botInfo = await getLineBotInfo()
    console.log(botInfo)
    return NextResponse.json({
      success: true,
      data: botInfo
    })
  } catch (error) {
    console.error('Error getting LINE bot info:', error)
    return NextResponse.json(
      { error: 'Failed to get LINE bot info: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}