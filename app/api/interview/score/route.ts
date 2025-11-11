/**
 * Interview Scoring API Route
 * POST /api/interview/score
 */

import { NextRequest, NextResponse } from 'next/server'
import { interviewService } from '@/lib/services/interview.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { z } from 'zod'

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

export const POST = secureRoute(handleScore, {
  middlewares: [rateLimit(RATE_LIMITS.AI)],
})







