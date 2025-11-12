import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const analyzeSchema = z.object({
  resumeId: z.string(),
  userId: z.string(),
  force: z.boolean().optional(),
})

async function handleAnalyze(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { prisma } = await import('@/lib/prisma')
  const { ensureProfile } = await import('@/lib/profile')
  const { buildBriefProfileContext } = await import('@/lib/utils/profile-context')
  const { analyzeResumeWithAI, buildFallbackResumeAnalysis } = await import('@/lib/services/resume.service')
  const { parseConversationTags } = await import('@/lib/ai/conversation-state')
  
  const body = await request.json()
  const { resumeId, userId, force } = analyzeSchema.parse(body)

  const authenticatedUserId = request.headers.get('x-user-id')
  if (!authenticatedUserId || authenticatedUserId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
    select: {
      id: true,
      fileName: true,
      extractedText: true,
      analysisResult: true,
      careerAlignment: true,
      improvementSuggestions: true,
      overallScore: true,
    },
  })

  if (!resume || !resume.extractedText) {
    return NextResponse.json({ error: 'Resume not found or no text extracted' }, { status: 404 })
  }

  if (
    !force &&
    (resume.analysisResult || resume.careerAlignment || resume.improvementSuggestions || resume.overallScore != null)
  ) {
    const existingAnalysis = parseStoredAnalysis(resume)

    return NextResponse.json(
      {
        resume: {
          id: resume.id,
          fileName: resume.fileName ?? null,
          overallScore: resume.overallScore ?? null,
        },
        analysis: existingAnalysis,
        cached: true,
      },
      { status: 200 }
    )
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

  const configuredTimeout = Number.parseInt(process.env.RESUME_ANALYSIS_TIMEOUT_MS ?? '', 10)
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : undefined

  let analysis
  let isFallback = false

  try {
    analysis = await analyzeResumeWithAI(
      { extractedText: resume.extractedText },
      {
        profileContext,
        targetRole,
        userStage: parsedContext?.stage ?? null,
        intent: parsedContext?.intent ?? null,
        enableFallback: true,
        timeoutMs,
      }
    )
  } catch (error) {
    console.error('resume_analysis_error', error)
    analysis = buildFallbackResumeAnalysis(resume.extractedText ?? '')
    isFallback = true
  }

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
      fallback: isFallback,
    },
    { status: 200 }
  )
}

function parseStoredAnalysis(resume: {
  analysisResult: string | null
  careerAlignment: string | null
  improvementSuggestions: string | null
  overallScore: number | null
}): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (resume.analysisResult) {
    try {
      Object.assign(result, JSON.parse(resume.analysisResult))
    } catch (error) {
      console.warn('resume_analysis_cache_parse_error', error)
    }
  }

  if (!('overallScore' in result) && resume.overallScore != null) {
    result.overallScore = resume.overallScore
  }

  if (!('careerAlignment' in result) && resume.careerAlignment) {
    try {
      result.careerAlignment = JSON.parse(resume.careerAlignment)
    } catch (error) {
      console.warn('resume_career_alignment_parse_error', error)
    }
  }

  if (!('improvementSuggestions' in result) && resume.improvementSuggestions) {
    try {
      result.improvementSuggestions = JSON.parse(resume.improvementSuggestions)
    } catch (error) {
      console.warn('resume_improvement_suggestions_parse_error', error)
    }
  }

  return result
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleAnalyze, {
    middlewares: [rateLimit(RATE_LIMITS.RESUME_ANALYSIS)],
  })
  return handler(request)
}

