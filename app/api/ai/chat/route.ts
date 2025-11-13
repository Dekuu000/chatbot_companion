/**
 * AI Chat API Route with Streaming
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { PERPLEXITY_DEFAULT_MODEL, buildCareerGuideUserPrompt, callAIWithFallback, type ChatMessage } from '@/lib/openai'
import { z } from 'zod'
// buildBriefProfileContext and buildProfileContext will be lazy imported
import { sanitizeWithLimit } from '@/lib/utils/sanitization'
// rateLimit and RATE_LIMITS will be lazy imported
// secureRoute will be lazy imported
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
  try {
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

  const saveMessage = async (convId: string | null, role: 'user' | 'assistant', content: string) => {
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

  const promptMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: enrichedPrompt },
  ]

  let assistantText = ''
  try {
    console.log('Starting AI call with fallback, message count:', promptMessages.length)
    console.log('Prompt messages preview:', promptMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
    
    // Use fallback function: try Perplexity first, fallback to Gemini on error
    const result = await callAIWithFallback(promptMessages, {
      model: PERPLEXITY_DEFAULT_MODEL,
      temperature: 0.35,
      stream: false,
    })

    console.log('AI call completed:', {
      provider: result.provider,
      model: result.model,
      contentLength: result.content?.length || 0,
      hasContent: !!result.content,
    })

    if (result.content && typeof result.content === 'string') {
      assistantText = stripInternalThought(result.content)
      console.log('Processed assistant text length:', assistantText.length)
      // Log which provider was used (for debugging)
      if (result.provider === 'gemini') {
        console.log('✅ Used Gemini fallback for chat response')
      }
    } else {
      console.warn('⚠️ AI response was empty or invalid:', {
        result,
        contentType: typeof result.content,
        hasContent: !!result.content,
      })
    }
  } catch (error) {
    console.error('❌ Model error caught:', error)
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // If it's an API key error, we should still try to use fallback
      if (error.message.includes('API key') || error.message.includes('not set')) {
        console.warn('API key error detected, will use fallback response')
        // Don't throw, let fallback handle it
      } else {
        // For other errors, log but continue with fallback
        console.warn('Non-API-key error, will use fallback response')
      }
    } else {
      console.error('Non-Error object:', JSON.stringify(error, null, 2))
    }
    // Continue with fallback builder - don't throw, let the fallback handle it
    // assistantText will remain empty, and fallback will be used
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
  } catch (error) {
    console.error('❌ handleChat error caught:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    } else {
      console.error('Non-Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }
    
    // Return detailed error for debugging (always include details for now)
    const errorDetails = {
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name || typeof error,
      // Include API key status for debugging
      apiKeys: {
        hasPerplexity: !!(process.env.PERPLEXITY_API_KEY?.trim()),
        hasGemini: !!(process.env.GEMINI_API_KEY?.trim()),
      },
    }
    return NextResponse.json(errorDetails, { status: 500 })
  }
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

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  try {
    // Lazy import secureRoute and rateLimit to prevent any build-time analysis
    const { secureRoute } = await import('@/lib/middleware/route-guards')
    const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
    const handler = secureRoute(handleChat, {
      allowGuest: true,
      middlewares: [rateLimit(RATE_LIMITS.AI)],
    })
    return handler(request)
  } catch (error) {
    console.error('POST handler error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    const errorDetails = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name || typeof error,
      // Include API key status for debugging
      apiKeys: {
        hasPerplexity: !!(process.env.PERPLEXITY_API_KEY?.trim()),
        hasGemini: !!(process.env.GEMINI_API_KEY?.trim()),
      },
    }
    return NextResponse.json(errorDetails, { status: 500 })
  }
}
