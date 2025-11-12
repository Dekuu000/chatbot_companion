/**
 * Profile API Routes
 * GET /api/profile - Get user profile
 * PUT /api/profile - Update user profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateProfileSchema = z.object({
  userId: z.string(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  educationLevel: z.string().optional(),
  major: z.string().optional().nullable(),
  currentYear: z.string().optional().nullable(),
  goals: z.string().optional().nullable(),
})

async function handleGetProfile(request: NextRequest) {
  try {
    // Lazy import to prevent Prisma initialization during build
    const { ensureProfile } = await import('@/lib/profile')
    
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureProfile(userId)

    return NextResponse.json(
      {
        profile: {
          ...profile,
          skills: JSON.parse(profile.skills || '[]'),
          interests: JSON.parse(profile.interests || '[]'),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}

async function handleUpdateProfile(request: NextRequest) {
  try {
    // Lazy import to prevent Prisma initialization during build
    const { prisma } = await import('@/lib/prisma')
    const { ensureProfile } = await import('@/lib/profile')
    
    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const userId = request.headers.get('x-user-id')
    if (!userId || userId !== data.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureProfile(data.userId)

    const updateData: any = {}
    if (data.skills !== undefined) {
      updateData.skills = JSON.stringify(data.skills)
    }
    if (data.interests !== undefined) {
      updateData.interests = JSON.stringify(data.interests)
    }
    if (data.educationLevel !== undefined) {
      updateData.educationLevel = data.educationLevel
    }
    if (data.major !== undefined) {
      updateData.major = data.major
    }
    if (data.currentYear !== undefined) {
      updateData.currentYear = data.currentYear
    }
    if (data.goals !== undefined) {
      updateData.goals = data.goals
    }

    const updated = await prisma.profile.update({
      where: { userId: data.userId },
      data: updateData,
    })

    return NextResponse.json(
      {
        profile: {
          ...updated,
          skills: JSON.parse(updated.skills || '[]'),
          interests: JSON.parse(updated.interests || '[]'),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update profile error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

// Export handlers directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(handleGetProfile, { skipErrorWrapper: true })
  return handler(request)
}

export async function PUT(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(handleUpdateProfile, { skipErrorWrapper: true })
  return handler(request)
}










