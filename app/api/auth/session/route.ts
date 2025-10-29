/**
 * Get Session API Route
 * GET /api/auth/session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get userId from request header (in demo mode)
    // In production, use secure cookies or JWT
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    const session = await getUserSession(userId)

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    return NextResponse.json({ session }, { status: 200 })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
