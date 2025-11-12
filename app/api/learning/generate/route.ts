/**
 * Learning Path Generator API Route
 * POST /api/learning/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeInput } from '@/lib/utils/sanitization'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const generateSchema = z.object({
  userId: z.string(),
  careerGoal: z.string().min(1).max(200),
})

async function handleGenerate(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { learningPathService } = await import('@/lib/services/learning-path.service')
  const { analyticsService } = await import('@/lib/services/analytics.service')
  
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







