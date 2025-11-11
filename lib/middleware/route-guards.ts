import type { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/errors/error-handler'
import { withMiddleware, type Middleware } from './index'
import { authenticate } from './auth'

type RouteHandler = (req: NextRequest) => Promise<NextResponse>

interface GuardOptions {
  allowGuest?: boolean
  middlewares?: Middleware[]
  skipErrorWrapper?: boolean
}

/**
 * Wraps a route handler with standard authentication middleware and (optionally)
 * supplementary middleware such as rate limiting. By default, guests are blocked.
 */
export function secureRoute(handler: RouteHandler, options: GuardOptions = {}) {
  const { allowGuest = false, middlewares = [], skipErrorWrapper = false } = options
  const pipeline = [...middlewares, authenticate(allowGuest)]
  const wrappedHandler = withMiddleware(handler, pipeline)

  if (skipErrorWrapper) {
    return wrappedHandler
  }

  return withErrorHandling(wrappedHandler)
}

