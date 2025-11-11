/**
 * Get User Career Suggestions API Route
 * GET /api/careers/list?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handleList(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { careerService } = await import('@/lib/services/career.service')
  
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const suggestions = await careerService.getUserSuggestions(userId, 20)

  return NextResponse.json({ suggestions }, { status: 200 })
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleList, {
    middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
  })
  return handler(request)
}






