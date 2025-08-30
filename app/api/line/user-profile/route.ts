import { NextRequest, NextResponse } from 'next/server'
import { getLineUserProfile } from '@/lib/line'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }
    
    const userProfile = await getLineUserProfile(userId)
    
    return NextResponse.json({
      success: true,
      data: userProfile
    })
  } catch (error) {
    console.error('Error getting LINE user profile:', error)
    return NextResponse.json(
      { error: 'Failed to get LINE user profile: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}