/**
 * Signup API Route
 * POST /api/auth/signup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createUserAccount } from '@/lib/auth'
import { ensureProfile } from '@/lib/profile'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = signupSchema.parse(body)

    const session = await createUserAccount({
      email: email.trim(),
      password,
      name: name?.trim(),
    })

    // Automatically create a profile for the new user
    await ensureProfile(session.userId)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    // Handle duplicate email error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Log detailed error for debugging
    console.error('Signup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Return more detailed error in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: errorMessage,
          stack: errorStack
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}

