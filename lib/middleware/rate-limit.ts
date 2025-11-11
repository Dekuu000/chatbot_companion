/**
 * Rate Limiting Middleware
 * Basic in-memory rate limiting (for production, use Redis-based solution)
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  requests: number // Number of requests allowed
  window: number // Time window in seconds
  identifier?: (req: NextRequest) => string // Custom identifier function
}

interface RateLimitStore {
  count: number
  resetAt: number
}

// In-memory store (for production, use Redis)
const rateLimitStore = new Map<string, RateLimitStore>()

/**
 * Cleans up expired entries from the rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of Array.from(rateLimitStore.entries())) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Gets identifier for rate limiting (user ID or IP address)
 */
function getIdentifier(req: NextRequest): string {
  // Try to get user ID from headers (set by auth middleware)
  const userId = req.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip.split(',')[0].trim()}`
}

/**
 * Checks if request is within rate limit
 * @param identifier - Unique identifier (user ID or IP)
 * @param config - Rate limit configuration
 * @returns Object with success status and remaining requests
 */
function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const windowMs = config.window * 1000

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup on each request
    cleanupExpiredEntries()
  }

  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      success: true,
      remaining: config.requests - 1,
      resetAt: now + windowMs,
    }
  }

  // Increment count
  entry.count++

  if (entry.count > config.requests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    success: true,
    remaining: config.requests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Rate limiting middleware
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const identifier = config.identifier ? config.identifier(req) : getIdentifier(req)
    const result = checkRateLimit(identifier, config)

    if (!result.success) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      )

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', config.requests.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())
      response.headers.set('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000).toString())

      return response
    }

    // Add rate limit headers to successful requests
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', config.requests.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())

    return null // null means continue to next middleware/handler
  }
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // General API: 100 requests per hour
  DEFAULT: { requests: 100, window: 3600 },
  // AI endpoints: 50 requests per hour (more expensive)
  AI: { requests: 50, window: 3600 },
  // Resume analysis: 10 requests per hour (very expensive)
  RESUME_ANALYSIS: { requests: 10, window: 3600 },
  // Career suggestions: 20 requests per hour
  CAREER_SUGGESTIONS: { requests: 20, window: 3600 },
} as const

