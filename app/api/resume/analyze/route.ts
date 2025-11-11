import { NextRequest, NextResponse } from 'next/server'
import { ensureProfile } from '@/lib/profile'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { buildBriefProfileContext } from '@/lib/utils/profile-context'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { analyzeResumeWithAI } from '@/lib/services/resume.service'
import { parseConversationTags } from '@/lib/ai/conversation-state'

const analyzeSchema = z.object({
  resumeId: z.string(),
  userId: z.string(),
})

async function handleAnalyze(request: NextRequest) {
  const body = await request.json()
  const { resumeId, userId } = analyzeSchema.parse(body)

  const authenticatedUserId = request.headers.get('x-user-id')
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
  })

  if (!resume || !resume.extractedText) {
    return NextResponse.json({ error: 'Resume not found or no text extracted' }, { status: 404 })
  }

  const profile = await ensureProfile(userId)
  const profileContext = buildBriefProfileContext(profile)

  const latestConversation = await prisma.conversation.findFirst({
    where: {
      userId,
      archived: false,
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  const parsedContext = latestConversation
    ? parseConversationTags((latestConversation as any)?.contextTags ?? null)
    : null
  const targetRole = parsedContext?.targetRole ?? (profile.goals?.trim() || null)

  const analysis = await analyzeResumeWithAI(resume, {
    profileContext,
    targetRole,
    userStage: parsedContext?.stage ?? null,
    intent: parsedContext?.intent ?? null,
    enableFallback: true,
  })

  const updatedResume = await prisma.resume.update({
    where: { id: resumeId },
    data: {
      analysisResult: JSON.stringify(analysis),
      careerAlignment: JSON.stringify(analysis.careerAlignment || {}),
      improvementSuggestions: JSON.stringify(analysis.improvementSuggestions || []),
      overallScore: analysis.overallScore ?? null,
    },
    select: {
      id: true,
      fileName: true,
      overallScore: true,
    },
  })

  return NextResponse.json(
    {
      resume: updatedResume,
      analysis: {
        overallScore: analysis.overallScore,
        careerAlignment: analysis.careerAlignment,
        improvementSuggestions: analysis.improvementSuggestions,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        skillsIdentified: analysis.skillsIdentified,
      },
    },
    { status: 200 }
  )
}

export const POST = secureRoute(handleAnalyze, {
  middlewares: [rateLimit(RATE_LIMITS.RESUME_ANALYSIS)],
})

