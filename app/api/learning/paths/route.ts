/**
 * Learning Paths API Route
 * GET /api/learning/paths?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { learningPathService } from '@/lib/services/learning-path.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'

async function handleGetPaths(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const paths = await learningPathService.getUserLearningPaths(userId)

  return NextResponse.json({ paths }, { status: 200 })
}

export const GET = secureRoute(handleGetPaths, {
  middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
})







