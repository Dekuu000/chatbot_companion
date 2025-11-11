import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromResumeFile } from '@/lib/pdf-extractor'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

async function handleResumeFeedback(request: NextRequest) {
  try {
    // Lazy import to prevent Prisma initialization during build
    const { prisma } = await import('@/lib/prisma')
    const { ensureProfile } = await import('@/lib/profile')
    const { buildBriefProfileContext } = await import('@/lib/utils/profile-context')
    const { analyzeResumeWithAI, formatResumeAnalysisMessage } = await import('@/lib/services/resume.service')
    const { parseConversationTags } = await import('@/lib/ai/conversation-state')
    
    const authenticatedUserId = request.headers.get('x-user-id')
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const userId = (formData.get('userId') || '').toString()
    const prompt = (formData.get('prompt') || '').toString().trim()
    const existingConversationId = formData.get('conversationId')?.toString() || null

    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const effectiveUserId = userId || authenticatedUserId

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Resume file is required' }, { status: 400 })
    }

    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a PDF, DOCX, or plain text resume.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extractedText = await extractTextFromResumeFile(buffer, file.type)

    const resume = await prisma.resume.create({
      data: {
        userId: effectiveUserId,
        fileName: file.name,
        fileData: buffer,
        fileSize: file.size,
        mimeType: file.type,
        extractedText,
      },
    })

    const profile = await ensureProfile(effectiveUserId)
    const profileContext = buildBriefProfileContext(profile)

    const latestConversation = await prisma.conversation.findFirst({
      where: {
        userId: effectiveUserId,
        archived: false,
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    const parsedContext = latestConversation
      ? parseConversationTags((latestConversation as any)?.contextTags ?? null)
      : null

    const analysis = await analyzeResumeWithAI(resume, {
      profileContext,
      targetRole: parsedContext?.targetRole ?? (profile.goals?.trim() || null),
      userStage: parsedContext?.stage ?? null,
      intent: parsedContext?.intent ?? null,
      enableFallback: true,
    })

    await prisma.resume.update({
      where: { id: resume.id },
      data: {
        analysisResult: JSON.stringify(analysis),
        careerAlignment: JSON.stringify(analysis.careerAlignment || {}),
        improvementSuggestions: JSON.stringify(analysis.improvementSuggestions || []),
        overallScore: analysis.overallScore || null,
      },
    })

    const assistantMessage = formatResumeAnalysisMessage({
      analysis,
      resumeName: file.name,
      userPrompt: prompt,
    })

    let conversationId = existingConversationId
    let isNewConversation = false

    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: {
          userId: effectiveUserId,
          title: `Resume feedback: ${file.name}`.slice(0, 70),
          messageCount: 0,
        },
      })
      conversationId = conversation.id
      isNewConversation = true
    }

    const userMessagePieces: string[] = []
    if (prompt) {
      userMessagePieces.push(prompt)
    }
    userMessagePieces.push(`📎 Uploaded resume: ${file.name}`)
    const userMessageContent = userMessagePieces.join('\n\n')

    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userMessageContent,
      },
    })

    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantMessage,
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 2 },
      },
    })

    return NextResponse.json({
      conversationId,
      isNewConversation,
      assistantMessage,
      userMessage: userMessageContent,
    })
  } catch (error) {
    console.error('chat_resume_feedback_error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to process resume feedback: ${message}` }, { status: 500 })
  }
}
// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleResumeFeedback, {
    middlewares: [rateLimit(RATE_LIMITS.AI)],
  })
  return handler(request)
}

