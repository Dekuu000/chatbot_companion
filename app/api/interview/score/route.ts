/**
 * Interview Scoring API Route
 * POST /api/interview/score
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const scoreSchema = z.object({
  sessionId: z.string(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string(),
      audioUrl: z.string().optional(),
    })
  ),
})

async function handleScore(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { interviewService } = await import('@/lib/services/interview.service')
  const { analyticsService } = await import('@/lib/services/analytics.service')
  
  const body = await request.json()
  const { sessionId, responses } = scoreSchema.parse(body)

  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await interviewService.scoreInterview(sessionId, responses)

  // Track analytics
  await analyticsService.trackEvent({
    userId,
    action: 'interview_scored',
    entityType: 'interview',
    entityId: sessionId,
    metadata: { overallScore: result.overallScore },
  })

  return NextResponse.json({ result }, { status: 200 })
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleScore, {
    middlewares: [rateLimit(RATE_LIMITS.AI)],
  })
  return handler(request)
}







