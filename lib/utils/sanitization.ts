/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitizes a string input by removing HTML tags and normalizing
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove HTML tags (basic sanitization)
  let sanitized = input.replace(/<[^>]*>/g, '')

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:text\/html/gi, '')

  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ')

  // Normalize unicode
  try {
    sanitized = sanitized.normalize('NFKC')
  } catch {
    // If normalization fails, continue with original
  }

  return sanitized
}

/**
 * Sanitizes an array of strings
 * @param inputs - Array of raw user inputs
 * @returns Array of sanitized strings
 */
export function sanitizeArray(inputs: string[]): string[] {
  return inputs.map(sanitizeInput).filter((item) => item.length > 0)
}

/**
 * Validates and sanitizes a string with length limits
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string or empty string if invalid
 */
export function sanitizeWithLimit(input: string, maxLength: number = 10000): string {
  const sanitized = sanitizeInput(input)
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized
}

/**
 * Validates email format (basic validation)
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates username format (alphanumeric, underscore, hyphen, 3-30 chars)
 * @param username - Username to validate
 * @returns true if valid username format
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false
  }

  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
  return usernameRegex.test(username.trim())
}








