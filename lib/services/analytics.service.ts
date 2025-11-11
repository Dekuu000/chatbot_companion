/**
 * Analytics Service
 * Tracks user actions and system metrics
 */

import { prisma } from '../prisma'
import { logger } from '../logger/logger'

export interface AnalyticsEvent {
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export class AnalyticsService {
  /**
   * Track an event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Log to console (structured logging)
      logger.logUserAction(event.action, event.userId || 'anonymous', {
        entityType: event.entityType,
        entityId: event.entityId,
        ...event.metadata,
      })

      // Save to audit log
      await prisma.auditLog.create({
        data: {
          userId: event.userId || null,
          action: event.action,
          entityType: event.entityType || null,
          entityId: event.entityId || null,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        },
      })
    } catch (error) {
      // Don't fail the request if analytics fails
      logger.error('Failed to track analytics event', error)
    }
  }

  /**
   * Track API request
   */
  async trackAPIRequest(
    method: string,
    path: string,
    userId?: string,
    statusCode?: number,
    duration?: number
  ): Promise<void> {
    await this.trackEvent({
      userId,
      action: 'api_request',
      metadata: {
        method,
        path,
        statusCode,
        duration,
      },
    })
  }

  /**
   * Track AI API call
   */
  async trackAICall(
    provider: string,
    model: string,
    userId?: string,
    tokens?: number,
    duration?: number
  ): Promise<void> {
    await this.trackEvent({
      userId,
      action: 'ai_api_call',
      metadata: {
        provider,
        model,
        tokens,
        duration,
      },
    })
  }

  /**
   * Get analytics for a user
   */
  async getUserAnalytics(userId: string, days: number = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const events = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Aggregate by action
    const actionCounts: Record<string, number> = {}
    events.forEach((event) => {
      actionCounts[event.action] = (actionCounts[event.action] || 0) + 1
    })

    return {
      totalEvents: events.length,
      actionCounts,
      recentEvents: events.slice(0, 50),
    }
  }
}

export const analyticsService = new AnalyticsService()








