/**
 * Profile Context Builder
 * Extracts profile context for AI personalization
 */

import { Profile } from '@prisma/client'

export interface ProfileContextOptions {
  format?: 'detailed' | 'brief'
  includeGoals?: boolean
}

/**
 * Builds a formatted profile context string for AI prompts
 * @param profile - User profile from database
 * @param options - Formatting options
 * @returns Formatted profile context string
 */
export function buildProfileContext(
  profile: Profile | null,
  options: ProfileContextOptions = {}
): string {
  if (!profile) {
    return ''
  }

  const { format = 'detailed', includeGoals = true } = options

  try {
    const skills = JSON.parse(profile.skills || '[]') as string[]
    const interests = JSON.parse(profile.interests || '[]') as string[]

    if (format === 'brief') {
      const parts: string[] = []
      if (profile.educationLevel) parts.push(`Education: ${profile.educationLevel}`)
      if (profile.major) parts.push(`Major: ${profile.major}`)
      if (skills.length > 0) parts.push(`Skills: ${skills.join(', ')}`)
      if (interests.length > 0) parts.push(`Interests: ${interests.join(', ')}`)
      if (includeGoals && profile.goals) parts.push(`Goals: ${profile.goals}`)

      return parts.length > 0 ? `User Profile: ${parts.join(' | ')}` : ''
    }

    // Detailed format (default)
    const contextParts: string[] = [
      `User Profile Context:`,
      `- Education Level: ${profile.educationLevel || 'Not specified'}`,
      `- Major: ${profile.major || 'Not specified'}`,
      `- Current Year: ${profile.currentYear || 'Not specified'}`,
      `- Skills: ${skills.length > 0 ? skills.join(', ') : 'None specified'}`,
      `- Interests: ${interests.length > 0 ? interests.join(', ') : 'None specified'}`,
    ]

    if (includeGoals) {
      contextParts.push(`- Career Goals: ${profile.goals || 'Not specified'}`)
    }

    contextParts.push('\nUse this profile information to provide personalized career guidance.')

    return contextParts.join('\n')
  } catch (error) {
    // If JSON parsing fails, return minimal context
    console.error('Failed to parse profile context:', error)
    return profile.educationLevel
      ? `User Profile: Education - ${profile.educationLevel}`
      : ''
  }
}

/**
 * Builds a brief profile context for specific use cases (e.g., resume analysis)
 * @param profile - User profile from database
 * @returns Brief profile context string
 */
export function buildBriefProfileContext(profile: Profile | null): string {
  return buildProfileContext(profile, { format: 'brief', includeGoals: true })
}








