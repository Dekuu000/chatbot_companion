/**
 * Quiz Questions API Route
 * GET /api/quiz/questions?type=skills|interests|personality
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  type: z.enum(['skills', 'interests', 'personality']),
})

async function handleGetQuestions(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { quizService } = await import('@/lib/services/quiz.service')
  
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || 'skills'

  const validated = querySchema.parse({ type })

  const questions = await quizService.getQuizQuestions(validated.type)

  return NextResponse.json({ questions }, { status: 200 })
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleGetQuestions, {
    middlewares: [rateLimit(RATE_LIMITS.DEFAULT)],
  })
  return handler(request)
}







