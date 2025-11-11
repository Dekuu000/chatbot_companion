/**
 * Quiz Questions API Route
 * GET /api/quiz/questions?type=skills|interests|personality
 */

import { NextRequest, NextResponse } from 'next/server'
import { quizService } from '@/lib/services/quiz.service'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { z } from 'zod'

const querySchema = z.object({
  type: z.enum(['skills', 'interests', 'personality']),
})

async function handleGetQuestions(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || 'skills'

  const validated = querySchema.parse({ type })

  const questions = await quizService.getQuizQuestions(validated.type)

  return NextResponse.json({ questions }, { status: 200 })
}

export const GET = secureRoute(handleGetQuestions, {
  middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
})







