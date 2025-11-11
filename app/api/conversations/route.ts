import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureRoute } from '@/lib/middleware/route-guards'
import { parseConversationTags } from '@/lib/ai/conversation-state'

async function listConversations(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId, archived: false },
    orderBy: { lastMessageAt: 'desc' },
    select: {
      id: true,
      title: true,
      lastMessageAt: true,
      contextTags: true,
      messageCount: true,
      messages: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        where: { role: 'user' },
        select: { content: true },
      },
    },
  })

  const formatted = conversations.map((conversation) => {
    const firstMessage = conversation.messages?.[0]?.content?.trim() ?? ''
    const trimmedTitle = conversation.title?.trim() ?? ''
    const preview = trimmedTitle || firstMessage || 'New chat'

    return {
      id: conversation.id,
      title: trimmedTitle || null,
      lastMessageAt: conversation.lastMessageAt,
      contextTags: parseConversationTags(conversation.contextTags),
      messageCount: conversation.messageCount ?? 0,
      preview,
    }
  })

  return NextResponse.json({ conversations: formatted }, { status: 200 })
}

async function createConversation(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: null,
      messageCount: 0,
    },
    select: {
      id: true,
      title: true,
    },
  })

  return NextResponse.json({ conversation }, { status: 201 })
}

export const GET = secureRoute(listConversations)
export const POST = secureRoute(createConversation)






