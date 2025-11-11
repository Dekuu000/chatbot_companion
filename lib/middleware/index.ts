/**
 * Middleware Composition Utilities
 * Combines multiple middleware functions
 */

import { NextRequest, NextResponse } from 'next/server'

export type Middleware = (req: NextRequest) => Promise<NextResponse | null>

/**
 * Composes multiple middleware functions
 * Returns null if all middleware pass, or the first error response
 * @param middlewares - Array of middleware functions
 * @returns Composed middleware function
 */
export function composeMiddleware(middlewares: Middleware[]): Middleware {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(req)
      if (result !== null) {
        // Middleware returned a response (error), stop and return it
        return result
      }
    }
    // All middleware passed
    return null
  }
}

/**
 * Wraps an API route handler with middleware
 * @param handler - Route handler function
 * @param middlewares - Array of middleware functions
 * @returns Wrapped handler
 */
export function withMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  middlewares: Middleware[]
) {
  const composed = composeMiddleware(middlewares)

  return async (req: NextRequest): Promise<NextResponse> => {
    // Run middleware
    const middlewareResult = await composed(req)
    if (middlewareResult !== null) {
      // Middleware returned an error response
      return middlewareResult
    }

    // All middleware passed, run handler
    return handler(req)
  }
}

