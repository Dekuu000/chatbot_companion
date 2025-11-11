/**
 * Get User Career Suggestions API Route
 * GET /api/careers/list?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { careerService } from '@/lib/services/career.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'

async function handleList(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const suggestions = await careerService.getUserSuggestions(userId, 20)

  return NextResponse.json({ suggestions }, { status: 200 })
}

export const GET = secureRoute(handleList, {
  middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
})






