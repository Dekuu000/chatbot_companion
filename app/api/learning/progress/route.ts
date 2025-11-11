/**
 * Learning Path Progress API Route
 * POST /api/learning/progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { learningPathService } from '@/lib/services/learning-path.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { z } from 'zod'

const progressSchema = z.object({
  pathId: z.string(),
  stepId: z.string(),
  completed: z.boolean(),
})

async function handleUpdateProgress(request: NextRequest) {
  const body = await request.json()
  const { pathId, stepId, completed } = progressSchema.parse(body)

  await learningPathService.updateProgress(pathId, stepId, completed)

  return NextResponse.json({ success: true }, { status: 200 })
}

export const POST = secureRoute(handleUpdateProgress, {
  middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
})







