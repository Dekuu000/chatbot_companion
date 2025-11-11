import type { PrismaClient, Profile } from '@prisma/client'
import type { IntentCategory, UserStage } from '@/lib/ai/chat-response'
import { ensureProfile } from '@/lib/profile'
import { parseResumeSnapshot, type HistoryMessage, type ResumeSnapshot, type CoachingContext } from '@/lib/ai/career-coach'

export interface ConversationTags {
  intent: IntentCategory
  stage: UserStage
  targetRole?: string | null
  persona?: string | null
  pivot?: boolean
  goalSummary?: string | null
  interestKey?: string | null
  updatedAt: string
}

export interface ConversationState {
  profile: Profile | null
  resume: ResumeSnapshot | null
  history: HistoryMessage[]
  tags: ConversationTags | null
}

export function parseConversationTags(raw: unknown): ConversationTags | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ConversationTags>
    if (!parsed.intent || !parsed.stage || !parsed.updatedAt) return null
    return {
      intent: parsed.intent,
      stage: parsed.stage,
      targetRole: parsed.targetRole ?? null,
      persona: parsed.persona ?? null,
      pivot: parsed.pivot ?? false,
      goalSummary: parsed.goalSummary ?? null,
      interestKey: parsed.interestKey ?? null,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export function buildConversationTags(
  context: CoachingContext,
  stage: UserStage,
  intent: IntentCategory
): ConversationTags {
  const now = new Date().toISOString()
  return {
    intent,
    stage,
    targetRole: context.targetDisplay || context.targetRole || null,
    persona: context.personaName || null,
    pivot: context.pivotDetected,
    goalSummary: context.conversationSummary || null,
    interestKey: context.interestKey ?? null,
    updatedAt: now,
  }
}

export async function loadConversationState(params: {
  prisma: PrismaClient
  userId?: string | null
  conversationId?: string | null
  historyLimit?: number
}): Promise<ConversationState> {
  const { prisma, userId, conversationId, historyLimit = 10 } = params

  if (!userId) {
    return {
      profile: null,
      resume: null,
      history: [],
      tags: null,
    }
  }

  const profile = await ensureProfile(userId)

  const resumeRecord = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  const resume = parseResumeSnapshot(resumeRecord)

  let tags: ConversationTags | null = null
  let history: HistoryMessage[] = []

  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (conversation && conversation.userId === userId) {
      const rawContextTags = (conversation as any)?.contextTags ?? null
      tags = parseConversationTags(rawContextTags)

      const historyRecords = await prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: historyLimit,
      })

      history = historyRecords.map((record) => ({
        role: record.role === 'assistant' ? 'assistant' : 'user',
        content: record.content,
      }))
    }
  }

  return {
    profile,
    resume,
    history,
    tags,
  }
}

