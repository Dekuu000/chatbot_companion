import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function ensureConversationOwnership(conversationId: string, userId: string) {
  try {
    // Lazy import prisma to prevent initialization during build
    const { prisma } = await import('@/lib/prisma')
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        archived: false,
      },
    })

    if (!conversation) {
      return null
    }

    return conversation
  } catch (error) {
    console.warn('conversation_lookup_fallback', error instanceof Error ? error.message : error)
    // Lazy import memory functions to prevent any build-time analysis
    const { memoryGetConversation } = await import('@/lib/cache/conversation-store')
    const conversation = memoryGetConversation(conversationId)
    if (conversation && conversation.userId === userId && !conversation.archived) {
      return conversation
    }
    return null
  }
}

async function listMessages(request: NextRequest, params: { id: string }) {
  const userId = request.headers.get('x-user-id') ?? request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversation = await ensureConversationOwnership(params.id, userId)
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Lazy import prisma to prevent initialization during build
    const { prisma } = await import('@/lib/prisma')
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    })

    // Lazy import parseConversationTags to prevent Prisma type analysis during build
    const { parseConversationTags } = await import('@/lib/ai/conversation-state')
    return NextResponse.json(
      {
        messages,
        contextTags: parseConversationTags(conversation.contextTags),
      },
      { status: 200 }
    )
  } catch (error) {
    console.warn('conversation_messages_fallback', error instanceof Error ? error.message : error)
    // Lazy import memory functions to prevent any build-time analysis
    const { memoryListMessages } = await import('@/lib/cache/conversation-store')
    const { parseConversationTags } = await import('@/lib/ai/conversation-state')
    const fallback = memoryListMessages(conversation.id)
    if (!fallback) {
      return NextResponse.json({ messages: [], contextTags: null }, { status: 200 })
    }
    return NextResponse.json(
      {
        messages: fallback.messages,
        contextTags: parseConversationTags(fallback.conversation.contextTags),
      },
      { status: 200 }
    )
  }
}

async function createMessage(request: NextRequest, params: { id: string }) {
  const userId = request.headers.get('x-user-id') ?? request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversation = await ensureConversationOwnership(params.id, userId)
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const role = typeof body?.role === 'string' ? body.role : null
  const content = typeof body?.content === 'string' ? body.content : null

  if (!role || !content) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    // Lazy import prisma to prevent initialization during build
    const { prisma } = await import('@/lib/prisma')
    const message = await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role, content },
      select: { id: true, role: true, content: true },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.warn('conversation_message_create_fallback', error instanceof Error ? error.message : error)
    // Lazy import memory functions to prevent any build-time analysis
    const { memoryAddMessage } = await import('@/lib/cache/conversation-store')
    const message = memoryAddMessage(conversation.id, role as 'user' | 'assistant', content)
    if (!message) {
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
    }
    return NextResponse.json({ message }, { status: 201 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { id } = await params
  const handler = secureRoute((req) => listMessages(req, { id }))
  return handler(request)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { id } = await params
  const handler = secureRoute((req) => createMessage(req, { id }))
  return handler(request)
}






