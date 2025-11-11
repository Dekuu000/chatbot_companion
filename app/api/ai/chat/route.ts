/**
 * AI Chat API Route with Streaming
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPerplexityHeaders, PERPLEXITY_API_URL, PERPLEXITY_DEFAULT_MODEL, buildCareerGuideUserPrompt } from '@/lib/openai'
import { z } from 'zod'
// buildBriefProfileContext and buildProfileContext will be lazy imported
import { sanitizeWithLimit } from '@/lib/utils/sanitization'
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { secureRoute } from '@/lib/middleware/route-guards'
import { buildIntentAwareFallback, determineUserStage, detectIntent, formatAdvisorResponse, messageIsAmbiguous, messageSuggestsTagalog, stripInternalThought } from '@/lib/ai/chat-response'
import { deriveCoachingContext, buildPersonalizedCoachPlan, enforceContextualRelevance, buildSystemPrompt, getIntentScaffold } from '@/lib/ai/career-coach'
import { USER_STAGE_FOCUS } from '@/lib/ai/career-coach'
// buildConversationTags will be lazy imported
import type { ConversationTags } from '@/lib/ai/conversation-state'
import type { UserStage } from '@/lib/ai/chat-response'
import type { Profile } from '@prisma/client'
import type { HistoryMessage, ResumeSnapshot } from '@/lib/ai/career-coach'
import { listLearningTracks } from '@/lib/content/ph-knowledge'
import { mapInterestToCareers, describeInterest } from '@/lib/ai/interest-profiles'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
})

async function handleChat(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { prisma } = await import('@/lib/prisma')
  const { analyticsService } = await import('@/lib/services/analytics.service')
  let body: any
  try {
    body = await request.json()
    console.log('Chat request received:', { hasBody: !!body, hasMessage: !!body?.message, hasUserId: !!body?.userId })
  } catch (err) {
    console.error('Error parsing request body:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parseResult = chatSchema.safeParse(body)
  if (!parseResult.success) {
    console.error('Validation error:', parseResult.error.errors)
    return NextResponse.json({ error: 'Invalid request', details: parseResult.error.errors }, { status: 400 })
  }
  const { message, conversationId, userId } = parseResult.data

  const sanitizedMessage = sanitizeWithLimit(message, 5000)

  const wantsTagalog = messageSuggestsTagalog(sanitizedMessage)
  const isAnonymous = !userId || userId === 'anon' || userId === 'demo'
  const sessionMode = isAnonymous ? 'guest' : 'authenticated'

  let convId: string | null = conversationId ?? null
  let profile: Profile | null = null
  let resumeSnapshot: ResumeSnapshot | null = null
  let conversationHistory: HistoryMessage[] = []
  let previousTags: ConversationTags | null = null

  if (!isAnonymous && userId) {
    try {
      // Lazy import loadConversationState to prevent Prisma type analysis during build
      const { loadConversationState } = await import('@/lib/ai/conversation-state')
      const state = await loadConversationState({
        prisma,
        userId,
        conversationId: convId,
        historyLimit: 10,
      })
      profile = state.profile
      resumeSnapshot = state.resume
      conversationHistory = state.history
      previousTags = state.tags
    } catch (error) {
      console.error('conversation_state_error', error)
    }
  }

  // Lazy import buildProfileContext to prevent Prisma type analysis during build
  const { buildProfileContext } = await import('@/lib/utils/profile-context')
  const profileContext = profile ? buildProfileContext(profile) : ''
  const userStage = determineUserStage(sanitizedMessage, profile || null)
  let intentResult = detectIntent(sanitizedMessage)
  let intent = intentResult.category
  const detectedInterestKey = intentResult.interestKey ?? null
  const detectedInterestLabel = intentResult.interestLabel ?? null
  const priorInterestKey = previousTags?.interestKey ?? null
  const interestKey = detectedInterestKey || priorInterestKey || null
  const interestLabel = detectedInterestLabel || describeInterest(interestKey) || null
  const interestCareers = mapInterestToCareers(interestKey)

  if (messageIsAmbiguous(sanitizedMessage)) {
    intent = 'clarification'
  }

  const personaContext = `Stage: ${userStage}\nGuidance focus: ${USER_STAGE_FOCUS[userStage]}\nKeep tone friendly, concise, and Philippines-specific.`

  async function saveMessage(convId: string | null, role: 'user' | 'assistant', content: string) {
    if (isAnonymous || !convId) return
    try {
      await prisma.chatMessage.create({
        data: {
          conversationId: convId,
          role,
          content,
        },
      })
    } catch (err) {
      console.error(`Error saving ${role} message:`, err)
    }
  }

  let isNewConversation = false
  if (!isAnonymous && userId) {
    try {
      if (!convId) {
        const conversation = await prisma.conversation.create({
          data: {
            userId,
            messageCount: 0,
            title: null,
          },
        })
        convId = conversation.id
        isNewConversation = true
      }
    } catch (err) {
      console.error('Error managing conversation:', err)
    }
  }

  const debugContext = {
    userId,
    convId,
    isNewConversation,
    historyLength: conversationHistory.length,
  }

  const isFirstUserMessage = isNewConversation || conversationHistory.length === 0
  const prospectiveTitle = isFirstUserMessage
    ? (() => {
        const trimmed = sanitizedMessage.trim().replace(/[?!]+$/, '')
        if (!trimmed) return null
        const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
        return capitalised.length > 50 ? `${capitalised.slice(0, 47)}...` : capitalised
      })()
    : null

  if (!isAnonymous && convId) {
    try {
      await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            conversationId: convId,
            role: 'user',
            content: sanitizedMessage,
          },
        }),
        prisma.conversation.update({
          where: { id: convId },
          data: {
            messageCount: { increment: 1 },
            lastMessageAt: new Date(),
            ...(prospectiveTitle ? { title: prospectiveTitle } : {}),
          },
        }),
      ])
      console.log('conversation_update_success', { ...debugContext, prospectiveTitle })
    } catch (error) {
      console.error('conversation_update_error', { error, ...debugContext })
    }
  } else {
    await saveMessage(convId, 'user', sanitizedMessage)
  }

  if (wantsTagalog) {
    const response = `Happy to match your preferred language so everything feels natural.\n\n## Language Options\n- English — I’ll keep explanations concise and easy to scan.\n\n- Tagalog — I can translate future answers while staying beginner-friendly.\n\nWhich language should we continue with so I can guide you better?`
    await saveMessage(convId, 'assistant', response)
    return streamResponse(convId, isNewConversation, response)
  }

  const headers = getPerplexityHeaders()

  const coachingContext = deriveCoachingContext({
    message: sanitizedMessage,
    intent,
    stage: userStage,
    profile,
    resume: resumeSnapshot,
    history: conversationHistory,
    interestKey,
    interestLabel,
    recommendedCareers: interestCareers,
  })
  const learningTracks = listLearningTracks(coachingContext.targetDisplay || coachingContext.targetRole)
  // Lazy import buildConversationTags to prevent Prisma type analysis during build
  const { buildConversationTags } = await import('@/lib/ai/conversation-state')
  const conversationTags = !isAnonymous && userId ? buildConversationTags(coachingContext, userStage, intent) : null

  const combinedPersonaContext = `${personaContext}\nPersona: ${coachingContext.personaName}\n${coachingContext.personaContext}`

  const intentFocus = getIntentScaffold(intent)
  // Lazy import buildBriefProfileContext to prevent Prisma type analysis during build
  const { buildBriefProfileContext } = await import('@/lib/utils/profile-context')
  const profileSummary = profile ? buildBriefProfileContext(profile) : undefined
  const systemPrompt = buildSystemPrompt({
    mode: sessionMode,
    stage: userStage,
    personaName: coachingContext.personaName,
    personaContext: coachingContext.personaContext,
    intent,
    localization: 'ph',
    profileSummary,
    resumeSummary: sessionMode === 'authenticated' ? coachingContext.resumeSummary : undefined,
    memorySummary: sessionMode === 'authenticated' ? coachingContext.memorySummary : undefined,
    skillGaps: sessionMode === 'authenticated' ? coachingContext.missingDetails : undefined,
    priorTags: previousTags ?? undefined,
    targetRole: coachingContext.targetDisplay || coachingContext.targetRole || null,
    marketContext: coachingContext.marketSnapshot ?? null,
    learningTracks: learningTracks.length ? learningTracks : undefined,
    interestLabel: coachingContext.interestLabel ?? null,
    recommendedCareers: coachingContext.recommendedCareers,
  })

  const enrichedPrompt = buildCareerGuideUserPrompt({
    userMessage: sanitizedMessage,
    personaContext: combinedPersonaContext,
    profileContext,
    detectedIntent: intent,
    userStage,
    targetRole: coachingContext.targetDisplay,
    currentRole: coachingContext.currentDisplay,
    resumeSummary: coachingContext.resumeSummary,
    conversationSummary: coachingContext.conversationSummary,
    missingDetails: coachingContext.missingDetails,
    personaName: coachingContext.personaName,
    memorySummary: coachingContext.memorySummary,
    intentFocus,
    marketSnapshot: coachingContext.marketSnapshot,
    recommendedProjects: coachingContext.recommendedProjects,
    interestLabel: coachingContext.interestLabel,
    recommendedCareers: coachingContext.recommendedCareers,
  })

  const promptMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: enrichedPrompt },
  ]

  let assistantText = ''
  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: PERPLEXITY_DEFAULT_MODEL,
        messages: promptMessages,
        temperature: 0.35,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const json = await response.json().catch(() => null)
    const content = json?.choices?.[0]?.message?.content

    if (content && typeof content === 'string') {
      assistantText = stripInternalThought(content.trim())
    }
  } catch (error) {
    console.error('Model error:', error)
  }

  const hasTargetContext =
    Boolean(coachingContext.targetDisplay || coachingContext.targetRole || coachingContext.recommendedCareers.length)

  let usedFallback = false
  const fallbackBuilder = () => {
    usedFallback = true
    if (hasTargetContext && intent !== 'skills') {
      return buildPersonalizedCoachPlan(coachingContext)
    }
    return buildIntentAwareFallback({
      intent,
      stage: userStage,
      message: sanitizedMessage,
      interestLabel: coachingContext.interestLabel,
    })
  }

  const vettedContent = enforceContextualRelevance(assistantText, coachingContext)
  let finalResponse = vettedContent ? formatAdvisorResponse(vettedContent, fallbackBuilder) : fallbackBuilder()
  finalResponse = formatAdvisorResponse(finalResponse, fallbackBuilder)

  await analyticsService.trackEvent({
    userId: !isAnonymous && userId ? userId : undefined,
    action: 'career_chat_response',
    entityType: 'career_chat',
    entityId: convId || undefined,
    metadata: {
      stage: userStage,
      intent,
      usedFallback,
      targetRole: coachingContext.targetDisplay,
      persona: coachingContext.personaName,
      pivot: coachingContext.pivotDetected,
      interestKey: coachingContext.interestKey ?? null,
      interestLabel: coachingContext.interestLabel ?? null,
      recommendedCareers: coachingContext.recommendedCareers.slice(0, 4),
      conversationTags,
    },
  })

  await saveMessage(convId, 'assistant', finalResponse)

  if (!isAnonymous && convId && conversationTags) {
    try {
      await prisma.conversation.update({
        where: { id: convId },
        data: {
          contextTags: JSON.stringify(conversationTags),
          lastMessageAt: new Date(),
        } as any,
      })
    } catch (error) {
      console.error('conversation_tags_update_error', error)
    }
  }

  return streamResponse(convId, isNewConversation, finalResponse)
}

function streamResponse(convId: string | null, isNewConversation: boolean, content: string) {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      if (convId && isNewConversation) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`))
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export const POST = secureRoute(handleChat, {
  allowGuest: true,
  middlewares: [rateLimit(RATE_LIMITS.AI)],
})
