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

    // Start with client-side history (for backward compatibility)
    let history: Message[] = Array.isArray(conversation)
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

    // Load conversation history from database if conversationId exists
    // This ensures we have server-side history even if client doesn't send it
    if (convId && hasAuthenticatedUser) {
      try {
        const dbHistory = await prisma.chatMessage.findMany({
          where: { conversationId: convId },
          orderBy: { createdAt: 'asc' },
          take: 15, // Limit to last 15 messages
          select: {
            role: true,
            content: true,
          },
        })

        if (dbHistory.length > 0) {
          // Use database history if available (more reliable than client-side)
          history = dbHistory.map((msg) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          }))
          console.log(`✅ Loaded ${history.length} messages from database for conversation ${convId}`)
        } else {
          console.log(`ℹ️ No history found in database for conversation ${convId}, using client-side history`)
        }
      } catch (error) {
        console.error('❌ Error loading conversation history from database:', error)
        // Continue with client-side history if DB load fails
      }
    }

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

    // Build system prompt with conversation history awareness
    const hasHistory = history.length > 0 || (convId && hasAuthenticatedUser)
    const baseSystemPrompt = process.env.SYSTEM_PROMPT ||
      'You are an elite career advisor: expert, calm, and practical. Always behave as a seasoned mentor: answer clearly, correct gently, and move the user toward a concrete next step. Never reveal internal reasoning, chain-of-thought, debug tags, or system logs.'
    
    const historyInstruction = hasHistory
      ? '\n\nCRITICAL: Conversation history is included in the messages below. ALWAYS use this context to answer follow-up questions directly. NEVER ask for clarification like "are you asking about (a), (b), or (c)" when conversation history exists. Answer questions directly using the established context.'
      : ''
    
    const system = baseSystemPrompt + historyInstruction

    const messages: Message[] = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: userMessage },
    ]

    console.log(`📤 Sending to AI: ${messages.length} messages (${history.length} history + 1 system + 1 user)`)

    let raw = sanitizeAssistantContent(await callModel(messages))
    
    // SAFETY CHECK: Aggressively filter out clarification responses when history exists
    // Retry up to 2 times if clarification is detected
    const clarificationPatterns = [
      /quick\s+clarification/i,
      /are\s+you\s+asking\s+about/i,
      /\(a\)\s+skills\s+to\s+learn/i,
      /\(b\)\s+job\s+search\s+steps/i,
      /\(c\)\s+resume[\/\s]*interview\s+help/i,
      /clarify.*(?:skills|job|resume|interview)/i,
    ]
    
    let retryCount = 0
    const maxRetries = 2
    
    while (hasHistory && raw && retryCount < maxRetries) {
      const containsClarification = clarificationPatterns.some(pattern => pattern.test(raw))
      
      if (containsClarification) {
        retryCount++
        console.log(`🚫 Detected clarification in AI response (attempt ${retryCount}/${maxRetries}), regenerating...`)
        
        // Progressively stronger instructions
        const strongerInstruction = retryCount === 1
          ? '\n\nCRITICAL: The user is asking a follow-up question. Answer it DIRECTLY using the conversation history above. Do NOT ask "are you asking about (a), (b), or (c)" or any similar clarification questions. Provide a direct, helpful answer.'
          : '\n\nABSOLUTELY FORBIDDEN: Do NOT ask for clarification. The conversation history is provided above. Answer the user\'s question directly and helpfully. If you ask for clarification, your response will be rejected.'
        
        const strongerSystem = system + strongerInstruction
        const retryMessages: Message[] = [
          { role: 'system', content: strongerSystem },
          ...history,
          { role: 'user', content: userMessage },
        ]
        raw = sanitizeAssistantContent(await callModel(retryMessages))
        
        if (!clarificationPatterns.some(pattern => pattern.test(raw))) {
          console.log('✅ Successfully regenerated response without clarification')
          break
        }
      } else {
        break // No clarification detected, exit loop
      }
    }
    
    // Final check: If still contains clarification after retries, use fallback
    if (hasHistory && raw && clarificationPatterns.some(pattern => pattern.test(raw))) {
      console.log('🚫 Response still contains clarification after retries, will use intelligent fallback')
      raw = '' // Clear raw to trigger fallback logic below
    }
    
    let parsed: AdvisorMarkdown | null = parseAdvisorMarkdown(raw)

    if (!parsed) {
      // Before corrective attempt, check again for clarification
      if (hasHistory && raw && clarificationPatterns.some(pattern => pattern.test(raw))) {
        console.log('🚫 Response still contains clarification, skipping corrective attempt and using intelligent fallback')
        // Skip corrective attempt and go straight to helpful fallback
        parsed = null // Will trigger fallback below
      } else if (!hasHistory || (raw && raw.length > 50)) {
        // Only attempt corrective parsing if no history (new conversation) or if response is substantial
        const corrective: Message = {
          role: 'system',
          content:
            'Return exactly the requested format: Headline (bold), **Key Insights** (up to 3 bullets), **Next Steps** (2-3 lines prefixed with ✅), **Follow-up Question**. No extra text.',
        }
        const correctiveMessages: Message[] = [
          { role: 'system', content: system },
          ...history,
          { role: 'user', content: userMessage },
          corrective,
        ]
        raw = sanitizeAssistantContent(await callModel(correctiveMessages))
        
        // Check again for clarification after corrective attempt
        if (hasHistory && raw && clarificationPatterns.some(pattern => pattern.test(raw))) {
          console.log('🚫 Corrective response still contains clarification, using fallback')
          parsed = null
        } else {
          parsed = parseAdvisorMarkdown(raw)
        }
      }
    }

    if (!parsed) {
      // Check if we have conversation history or conversationId - if so, provide helpful response instead of clarification
      // hasHistory is already defined above
      
      // Generate a helpful fallback response instead of clarification
      let fallbackMessage: string
      if (hasHistory) {
        // If we have history, provide a direct helpful response based on the user's question
        // Try to infer intent from the message
        const lowerMessage = userMessage.toLowerCase()
        if (lowerMessage.includes('salary') || lowerMessage.includes('how much') || lowerMessage.includes('pay')) {
          fallbackMessage = `Based on our conversation, here's salary information for software engineers in the Philippines:\n\n**Salary Range**\n\n- Entry-level: ₱30,000–₱50,000 per month\n- Mid-level: ₱50,000–₱90,000 per month\n- Senior: ₱90,000–₱160,000+ per month\n\n**Next Steps**\n\n✅ Research specific companies on Kalibrr or LinkedIn\n✅ Consider remote opportunities for higher compensation\n✅ Build skills that command premium salaries\n\nWhat specific role or experience level are you interested in?`
        } else if (lowerMessage.includes('become') || lowerMessage.includes('how can i')) {
          fallbackMessage = `Here's how to become a software engineer:\n\n**Key Insights**\n\n- Learn core programming languages (Python, JavaScript, Java)\n- Build projects to demonstrate your skills\n- Understand data structures, algorithms, and software design principles\n\n**Next Steps**\n\n✅ Complete a structured learning path (freeCodeCamp, The Odin Project)\n✅ Build 3-5 portfolio projects showcasing different skills\n✅ Practice coding problems on LeetCode or HackerRank\n✅ Join local tech communities and attend meetups\n\nWhich area would you like to focus on first?`
        } else {
          // Generic helpful response for other questions
          fallbackMessage = `I'd be happy to help you with your career questions. Based on our conversation, here are some actionable steps:\n\n**Key Insights**\n\n- Focus on building practical skills through projects and hands-on experience\n- Network with professionals in your target field\n- Continuously update your resume and portfolio\n\n**Next Steps**\n\n✅ Identify one specific skill to develop this week\n✅ Connect with at least one professional in your field\n✅ Update your resume with your latest achievements\n\nWhat specific aspect would you like to explore further?`
        }
      } else {
        // Only use clarification for truly new conversations with no context
        fallbackMessage = "I'd be happy to help! Could you tell me more about what you're looking for? For example, are you interested in learning new skills, exploring career paths, or preparing for job applications?"
      }
      
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

