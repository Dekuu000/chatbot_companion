/**
 * Error Handler Middleware
 * Provides consistent error handling across API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { AppError, formatErrorResponse } from './errors'
import { ZodError } from 'zod'

/**
 * Checks if error should include details in response
 */
function shouldIncludeDetails(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_ERROR_DETAILS === 'true'
}

/**
 * Handles errors and returns appropriate HTTP response
 * @param error - Error instance
 * @returns NextResponse with error details
 */
export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle AppError instances
  if (error instanceof AppError) {
    const response = formatErrorResponse(error, shouldIncludeDetails())
    return NextResponse.json(response, { status: error.statusCode })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const response = formatErrorResponse(error, shouldIncludeDetails())
    return NextResponse.json(response, { status: 400 })
  }

  // Handle generic errors
  const response = formatErrorResponse(error, shouldIncludeDetails())
  return NextResponse.json(response, { status: 500 })
}

/**
 * Wraps an API route handler with error handling
 * @param handler - Async route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling<T extends NextRequest>(
  handler: (req: T) => Promise<NextResponse>
) {
  return async (req: T): Promise<NextResponse> => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}








