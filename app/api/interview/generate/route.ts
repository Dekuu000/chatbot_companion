/**
 * Interview Question Generator API Route
 * POST /api/interview/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeInput } from '@/lib/utils/sanitization'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const interviewSchema = z.object({
  userId: z.string(),
  jobTitle: z.string().min(1).max(200),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

async function handleGenerate(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { interviewService } = await import('@/lib/services/interview.service')
  
  const body = await request.json()
  const { userId, jobTitle, difficulty } = interviewSchema.parse(body)

  // Get user ID from headers (set by auth middleware)
  const authenticatedUserId = request.headers.get('x-user-id')
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sanitize job title
  const sanitizedJobTitle = sanitizeInput(jobTitle)

  try {
    const session = await interviewService.createSession(
      userId,
      sanitizedJobTitle,
      difficulty
    )

    const questions = Array.isArray(session.questions) ? session.questions : []

    return NextResponse.json(
      {
        sessionId: session.id,
        questions,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('interview_generate_error', error)
    return NextResponse.json(
      {
        error: 'Failed to generate interview questions',
        message: error?.message,
      },
      { status: 500 }
    )
  }
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleGenerate, {
    middlewares: [rateLimit(RATE_LIMITS.AI)],
  })
  return handler(request)
}





