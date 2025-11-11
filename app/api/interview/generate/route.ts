/**
 * Interview Question Generator API Route
 * POST /api/interview/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeInput } from '@/lib/utils/sanitization'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { interviewService } from '@/lib/services/interview.service'

const interviewSchema = z.object({
  userId: z.string(),
  jobTitle: z.string().min(1).max(200),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

async function handleGenerate(request: NextRequest) {
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

export const POST = secureRoute(handleGenerate, {
  middlewares: [rateLimit(RATE_LIMITS.AI)],
})




