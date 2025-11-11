/**
 * Get Session API Route
 * GET /api/auth/session
 */

import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Lazy import getUserSession to prevent Prisma initialization during build
    const { getUserSession } = await import('@/lib/auth')
    
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
