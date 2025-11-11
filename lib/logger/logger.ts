/**
 * Structured Logging Utility
 * Provides consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }
    console.error(this.formatMessage('error', message, errorContext))
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    userId?: string,
    statusCode?: number,
    duration?: number
  ): void {
    this.info('API Request', {
      method,
      path,
      userId,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    })
  }

  /**
   * Log AI API call
   */
  logAICall(provider: string, model: string, tokens?: number, duration?: number): void {
    this.info('AI API Call', {
      provider,
      model,
      tokens,
      duration: duration ? `${duration}ms` : undefined,
    })
  }

  /**
   * Log user action for analytics
   */
  logUserAction(action: string, userId: string, metadata?: Record<string, unknown>): void {
    this.info('User Action', {
      action,
      userId,
      ...metadata,
    })
  }
}

export const logger = new Logger()








