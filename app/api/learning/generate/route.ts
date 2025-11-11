/**
 * Learning Path Generator API Route
 * POST /api/learning/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { learningPathService } from '@/lib/services/learning-path.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { z } from 'zod'
import { sanitizeInput } from '@/lib/utils/sanitization'

const generateSchema = z.object({
  userId: z.string(),
  careerGoal: z.string().min(1).max(200),
})

async function handleGenerate(request: NextRequest) {
  const body = await request.json()
  const { userId, careerGoal } = generateSchema.parse(body)

  const authenticatedUserId = request.headers.get('x-user-id')
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sanitizedGoal = sanitizeInput(careerGoal)

  const learningPath = await learningPathService.generateLearningPath(
    userId,
    sanitizedGoal
  )

  // Track analytics
  await analyticsService.trackEvent({
    userId,
    action: 'learning_path_generated',
    entityType: 'learning_path',
    entityId: learningPath.id,
    metadata: { careerGoal: sanitizedGoal },
  })

  return NextResponse.json({ learningPath }, { status: 200 })
}

export const POST = secureRoute(handleGenerate, {
  middlewares: [rateLimit(RATE_LIMITS.AI)],
})







