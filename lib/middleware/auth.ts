/**
 * Authentication Middleware
 * Verifies user session and attaches user ID to request
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'

/**
 * Extracts user ID from request (body, query params, or headers)
 */
function extractUserId(req: NextRequest): string | null {
  // Try headers first (set by previous middleware)
  const headerUserId = req.headers.get('x-user-id')
  if (headerUserId) {
    return headerUserId
  }

  // Try query params
  const queryUserId = req.nextUrl.searchParams.get('userId')
  if (queryUserId) {
    return queryUserId
  }

  return null
}

/**
 * Authentication middleware
 * Verifies user session and attaches user ID to request headers
 * @param allowAnonymous - Whether to allow anonymous requests
 * @returns Middleware function
 */
export function authenticate(allowAnonymous: boolean = false) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const userId = extractUserId(req)

    // For anonymous routes, try to get userId from body if not in headers/query
    // Note: This is a best-effort attempt. The handler will need to parse body again.
    if (allowAnonymous && !userId) {
      // Don't read body here as it can only be read once
      // The handler will extract userId from body
      // Just allow the request to continue
      return null
    }

    // Allow anonymous requests if configured
    if (allowAnonymous && (!userId || userId === 'anon')) {
      return null // Continue without authentication
    }

    // Require user ID
    if (!userId || userId === 'anon') {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'AUTHENTICATION_ERROR',
        },
        { status: 401 }
      )
    }

    // Verify session
    try {
      const session = await getUserSession(userId)
      if (!session) {
        return NextResponse.json(
          {
            error: 'Invalid or expired session',
            code: 'AUTHENTICATION_ERROR',
          },
          { status: 401 }
        )
      }

      // Attach user ID to headers for downstream middleware/handlers
      req.headers.set('x-user-id', session.userId)
      if (session.name) {
        req.headers.set('x-user-name', session.name)
      }

      return null // Continue to next middleware/handler
    } catch (error) {
      console.error('Authentication error:', error)
      return NextResponse.json(
        {
          error: 'Authentication failed',
          code: 'AUTHENTICATION_ERROR',
        },
        { status: 401 }
      )
    }
  }
}




