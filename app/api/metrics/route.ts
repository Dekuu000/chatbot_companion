import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureRoute } from '@/lib/middleware/route-guards'

async function handleMetrics(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [users, conversations, messages] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count(),
    prisma.chatMessage.count(),
  ])
  return NextResponse.json({ users, conversations, messages })
}

export const GET = secureRoute(handleMetrics, { skipErrorWrapper: true })








