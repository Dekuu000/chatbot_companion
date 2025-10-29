/**
 * Demo Login API Route
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server'
import { demoLogin } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = loginSchema.parse(body)

    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const session = await demoLogin(username.trim())

    // In a real app, you'd set a secure HTTP-only cookie or JWT here
    // For demo, we'll return the session and let client store it
    return NextResponse.json({ session }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
