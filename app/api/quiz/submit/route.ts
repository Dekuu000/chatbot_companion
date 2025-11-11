/**
 * Quiz Submit API Route
 * POST /api/quiz/submit
 */

import { NextRequest, NextResponse } from 'next/server'
import { quizService } from '@/lib/services/quiz.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { z } from 'zod'

const submitSchema = z.object({
  userId: z.string(),
  quizType: z.enum(['skills', 'interests', 'personality']),
  responses: z.array(
    z.object({
      questionId: z.string(),
      answer: z.union([z.string(), z.number(), z.array(z.string())]),
    })
  ),
})

async function handleSubmit(request: NextRequest) {
  const body = await request.json()
  const { userId, quizType, responses } = submitSchema.parse(body)

  const authenticatedUserId = request.headers.get('x-user-id')
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await quizService.submitQuiz(userId, quizType, responses)

  // Track analytics
  await analyticsService.trackEvent({
    userId,
    action: 'quiz_completed',
    entityType: 'quiz',
    metadata: { quizType, resultCount: Object.keys(results).length },
  })

  return NextResponse.json({ results }, { status: 200 })
}

export const POST = secureRoute(handleSubmit, {
  middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
})







