/**
 * Custom Error Classes and Error Handling Utilities
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

/**
 * External API error (502)
 */
export class ExternalAPIError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'EXTERNAL_API_ERROR', details)
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
  timestamp?: string
}

/**
 * Converts an error to a standardized error response
 * @param error - Error instance
 * @param includeDetails - Whether to include error details in production
 * @returns Standardized error response
 */
export function formatErrorResponse(
  error: unknown,
  includeDetails: boolean = false
): ErrorResponse {
  // Handle known AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    }

    // Only include details in development or if explicitly allowed
    if (includeDetails && error.details) {
      response.details = error.details
    }

    return response
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: includeDetails ? error : undefined,
      timestamp: new Date().toISOString(),
    }
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'Internal server error'

  return {
    error: message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  }
}

