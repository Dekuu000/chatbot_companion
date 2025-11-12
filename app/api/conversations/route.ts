import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function listConversations(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { prisma } = await import('@/lib/prisma')
  
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

  // Lazy import parseConversationTags to prevent Prisma type analysis during build
  const { parseConversationTags } = await import('@/lib/ai/conversation-state')
  
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
  // Lazy import to prevent Prisma initialization during build
  const { prisma } = await import('@/lib/prisma')
  
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

// Export handlers directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(listConversations)
  return handler(request)
}

export async function POST(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(createConversation)
  return handler(request)
}






