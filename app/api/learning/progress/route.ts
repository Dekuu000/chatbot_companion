/**
 * Learning Path Progress API Route
 * POST /api/learning/progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const progressSchema = z.object({
  pathId: z.string(),
  stepId: z.string(),
  completed: z.boolean(),
})

async function handleUpdateProgress(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { learningPathService } = await import('@/lib/services/learning-path.service')
  
  const body = await request.json()
  const { pathId, stepId, completed } = progressSchema.parse(body)

  await learningPathService.updateProgress(pathId, stepId, completed)

  return NextResponse.json({ success: true }, { status: 200 })
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleUpdateProgress, {
    middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
  })
  return handler(request)
}







