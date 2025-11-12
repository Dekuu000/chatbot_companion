/**
 * Quiz Submit API Route
 * POST /api/quiz/submit
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  // Lazy import to prevent Prisma initialization during build
  const { quizService } = await import('@/lib/services/quiz.service')
  const { analyticsService } = await import('@/lib/services/analytics.service')
  
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

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleSubmit, {
    middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
  })
  return handler(request)
}







