import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handleMetrics(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { prisma } = await import('@/lib/prisma')
  
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

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(handleMetrics, { skipErrorWrapper: true })
  return handler(request)
}








