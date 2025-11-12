/**
 * Learning Paths API Route
 * GET /api/learning/paths?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handleGetPaths(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { learningPathService } = await import('@/lib/services/learning-path.service')
  
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const paths = await learningPathService.getUserLearningPaths(userId)

  return NextResponse.json({ paths }, { status: 200 })
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleGetPaths, {
    middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
  })
  return handler(request)
}







