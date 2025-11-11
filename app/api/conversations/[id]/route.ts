import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureRoute } from '@/lib/middleware/route-guards'
import { parseConversationTags } from '@/lib/ai/conversation-state'

async function getConversation(request: NextRequest, params: { id: string }) {
  const userId = request.headers.get('x-user-id') ?? request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      userId,
      archived: false,
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { contextTags, ...rest } = conversation as any
  return NextResponse.json(
    {
      conversation: {
        ...rest,
        contextTags: parseConversationTags(contextTags),
      },
    },
    { status: 200 }
  )
}

async function updateConversation(request: NextRequest, params: { id: string }) {
  const userId = request.headers.get('x-user-id') ?? request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      userId,
    },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body?.title === 'string') {
    data.title = body.title
  }
  if (typeof body?.archived === 'boolean') {
    data.archived = body.archived
  }

  const conversation = await prisma.conversation.update({
    where: { id: existing.id },
    data,
  })

  return NextResponse.json({ conversation }, { status: 200 })
}

async function deleteConversation(request: NextRequest, params: { id: string }) {
  const userId = request.headers.get('x-user-id') ?? request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      userId,
    },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.conversation.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true }, { status: 200 })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const handler = secureRoute((req) => getConversation(req, { id }))
  return handler(request)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const handler = secureRoute((req) => updateConversation(req, { id }))
  return handler(request)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const handler = secureRoute((req) => deleteConversation(req, { id }))
  return handler(request)
}






