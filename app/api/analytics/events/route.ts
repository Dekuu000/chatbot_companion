import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics.service'
import { z } from 'zod'

const eventSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') ?? request.headers.get('x-guest-id') ?? undefined
    const body = await request.json()
    const parsed = eventSchema.parse(body)

    await analyticsService.trackEvent({
      userId,
      action: parsed.action,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      metadata: parsed.metadata,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('analytics_event_error', error)
    return NextResponse.json({ error: 'Invalid analytics payload' }, { status: 400 })
  }
}




