import type { NextApiRequest, NextApiResponse } from 'next'
import { shouldUseAdvisorFlow } from '@/lib/ai/advisor-routing'
import { PERPLEXITY_DEFAULT_MODEL, callAIWithFallback } from '@/lib/openai'
import { sanitizeAssistantContent } from '@/lib/ai/chat-response'
import { parseAdvisorMarkdown, type AdvisorMarkdown } from '@/utils/aiResponseValidator'
import { prisma } from '@/lib/prisma'

type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callModel(messages: Message[]): Promise<string> {
  // Use fallback function: try Perplexity first, fallback to Gemini on error
  const result = await callAIWithFallback(messages, {
    model: PERPLEXITY_DEFAULT_MODEL,
    maxTokens: 800,
    temperature: 0.3,
  })
  return result.content
}

const DIRECT_PROMPT =
  'You are an elite career advisor. When a user asks a factual question, respond with a concise, direct answer in 1–3 sentences. Only include career planning if the user explicitly requests it.'

function toConversationTitle(text: string): string | null {
  const trimmed = text.trim().replace(/[?!]+$/, '')
  if (!trimmed) return null
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return capitalised.length > 50 ? `${capitalised.slice(0, 47)}...` : capitalised
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ ok: false, error: 'Method Not Allowed' })
    return
  }

  try {
    const {
      conversation = [],
      userMessage,
      advisorFlow,
      conversationId,
      userId: bodyUserId,
    } = req.body ?? {}

    if (!userMessage || typeof userMessage !== 'string') {
      res.status(400).json({ ok: false, error: 'Missing userMessage' })
      return
    }

    const history: Message[] = Array.isArray(conversation)
      ? conversation.filter(
          (msg): msg is Message =>
            msg &&
            typeof msg === 'object' &&
            (msg.role === 'user' || msg.role === 'assistant') &&
            typeof msg.content === 'string'
        )
      : []

    const useAdvisor =
      typeof advisorFlow === 'boolean' ? advisorFlow : shouldUseAdvisorFlow(userMessage)

    let convId: string | null =
      typeof conversationId === 'string' && conversationId.trim() ? conversationId.trim() : null

    const headerUserId = (req.headers['x-user-id'] || req.headers['x-user-id'.toLowerCase()]) as
      | string
      | undefined
    const cleanHeaderUserId = typeof headerUserId === 'string' && headerUserId.trim().length > 0 ? headerUserId.trim() : null
    const cleanBodyUserId =
      typeof bodyUserId === 'string' && bodyUserId.trim().length > 0 ? bodyUserId.trim() : null

    const effectiveUserId = cleanHeaderUserId ?? cleanBodyUserId
    const hasAuthenticatedUser = typeof effectiveUserId === 'string'

    const ensureConversation = async (): Promise<string | null> => {
      if (!hasAuthenticatedUser) return null
      const cleanUserId = effectiveUserId!
      if (convId) {
        const existing = await prisma.conversation.findFirst({
          where: { id: convId, userId: cleanUserId },
          select: { id: true },
        })
        if (existing) return convId
      }
      const created = await prisma.conversation.create({
        data: {
          userId: cleanUserId,
          messageCount: 0,
          title: null,
        },
        select: { id: true },
      })
      convId = created.id
      return convId
    }

    const recordUserMessage = async (text: string) => {
      if (!hasAuthenticatedUser) return
      const id = await ensureConversation()
      if (!id) return
      const title = toConversationTitle(text)
      
      // Check if this is the first message before building transaction
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: { messageCount: true },
      })
      const isFirstMessage = conversation?.messageCount === 0
      
      const tx = [
        prisma.chatMessage.create({
          data: {
            conversationId: id,
            role: 'user',
            content: text,
          },
        }),
        prisma.conversation.update({
          where: { id },
          data: {
            messageCount: { increment: 1 },
            lastMessageAt: new Date(),
            ...(title && isFirstMessage ? { title } : {}),
          },
        }),
      ]
      await prisma.$transaction(tx)
    }

    const recordAssistantMessage = async (content: string) => {
      if (!hasAuthenticatedUser || !convId) return
      await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            conversationId: convId,
            role: 'assistant',
            content,
          },
        }),
        prisma.conversation.update({
          where: { id: convId },
          data: {
            lastMessageAt: new Date(),
          },
        }),
      ])
    }

    await recordUserMessage(userMessage)

    if (!useAdvisor) {
      const directPrompt = process.env.SYSTEM_PROMPT_DIRECT || DIRECT_PROMPT
      const messages: Message[] = [
        { role: 'system', content: directPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ]

      const raw = sanitizeAssistantContent(await callModel(messages))
      if (!raw) {
        const fallbackMessage = "I'd be happy to help. Could you restate your question briefly?"
        await recordAssistantMessage(fallbackMessage)
        res
          .status(200)
          .json({ ok: true, fallback: true, message: fallbackMessage, conversationId: convId })
        return
      }

      await recordAssistantMessage(raw)

      res.status(200).json({ ok: true, fallback: false, message: raw, conversationId: convId })
      return
    }

    const system =
      process.env.SYSTEM_PROMPT ||
      'You are an elite career advisor: expert, calm, and practical. Always behave as a seasoned mentor: answer clearly, correct gently, and move the user toward a concrete next step. Never reveal internal reasoning, chain-of-thought, debug tags, or system logs.'

    const messages: Message[] = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: userMessage },
    ]

    let raw = sanitizeAssistantContent(await callModel(messages))
    let parsed: AdvisorMarkdown | null = parseAdvisorMarkdown(raw)

    if (!parsed) {
      const corrective: Message = {
        role: 'system',
        content:
          'Return exactly the requested format: Headline (bold), **Key Insights** (up to 3 bullets), **Next Steps** (2-3 lines prefixed with ✅), **Follow-up Question**. No extra text.',
      }
      raw = sanitizeAssistantContent(await callModel([...messages, corrective]))
      parsed = parseAdvisorMarkdown(raw)
    }

    if (!parsed) {
      const fallbackMessage =
        "Quick clarification: are you asking about (a) skills to learn, (b) job search steps, or (c) resume/interview help?"
      await recordAssistantMessage(fallbackMessage)
      res.status(200).json({
        ok: true,
        fallback: true,
        message: fallbackMessage,
        conversationId: convId,
      })
      return
    }

    await recordAssistantMessage(raw)

    res.status(200).json({ ok: true, fallback: false, raw, parsed, conversationId: convId })
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) })
  }
}

