/**
 * Career Service
 * Business logic for career suggestions
 */

import { prisma } from '../prisma'
import { aiClient } from '../ai/client'
import { buildProfileContext } from '../utils/profile-context'
import { memoryCache } from '../cache/memory-cache'
import { Profile } from '@prisma/client'

export interface CareerSuggestionInput {
  title: string
  skillsRequired: string | string[]
  summary: string
  salaryGuideline?: string
  nextSteps?: string
  confidenceScore?: number
  verificationPlan?: string
}

export class CareerService {
  /**
   * Generate career suggestions for a user
   */
  async suggestCareers(userId: string, query?: string, resumeText?: string): Promise<any[]> {
    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    // Check cache
    const cacheKey = `career-suggestions:${userId}:${this.hashInputs(query, resumeText)}`
    const cached = memoryCache.get<any[]>(cacheKey)
    if (cached) {
      return cached
    }

    // Build profile context
    const profileContext = buildProfileContext(profile, {
      format: 'brief',
      includeGoals: true,
    })

    // Generate suggestions
    const suggestions = await this.generateSuggestions(profile, query, profileContext, resumeText)

    // Save to database
    const saved = await this.saveSuggestions(userId, suggestions)

    // Cache results (24 hours)
    memoryCache.set(cacheKey, saved, 86400)

    return saved
  }

  /**
   * Generate suggestions using AI
   */
  private async generateSuggestions(
    profile: Profile,
    query: string | undefined,
    profileContext: string,
    resumeText?: string
  ): Promise<CareerSuggestionInput[]> {
    const userQuery = query || 'Suggest career paths based on my profile'
    const resumeContext = resumeText ? this.prepareResumeContext(resumeText) : ''

    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content: `You are a career guidance expert. Generate personalized career suggestions based on user profiles.`,
        },
        {
          role: 'user',
          content: `${profileContext ? `${profileContext}\n\n` : ''}${resumeContext ? `Resume Highlights:\n${resumeContext}\n\n` : ''}User Query: ${userQuery}\n\nRespond with a JSON object {"suggestions": [...]} where each item has: title, skillsRequired (array), summary, salaryGuideline, nextSteps, confidenceScore (0-1), verificationPlan. Focus on realistic roles for the Philippine tech ecosystem when possible.`,
        },
      ],
      {
        responseFormat: 'json_object',
        temperature: 0.7,
        cache: true,
        cacheTTL: 86400, // 24 hours
      }
    )

    try {
      const parsed = JSON.parse(response.content)
      let suggestions = parsed.suggestions || parsed.careers || []

      if (!Array.isArray(suggestions)) {
        suggestions = [suggestions]
      }

      return suggestions.map((s: any) => ({
        title: s.title || 'Career Path',
        skillsRequired: Array.isArray(s.skillsRequired)
          ? s.skillsRequired
          : typeof s.skillsRequired === 'string'
            ? s.skillsRequired.split(',').map((x: string) => x.trim())
            : [],
        summary: s.summary || '',
        salaryGuideline: s.salaryGuideline || null,
        nextSteps: s.nextSteps || null,
        confidenceScore: s.confidenceScore || null,
        verificationPlan: s.verificationPlan || null,
      }))
    } catch (error) {
      console.error('Failed to parse career suggestions:', error)
      throw new Error('Failed to parse career suggestions from AI response')
    }
  }

  /**
   * Save suggestions to database
   */
  private async saveSuggestions(
    userId: string,
    suggestions: CareerSuggestionInput[]
  ): Promise<any[]> {
    await prisma.careerSuggestion.deleteMany({ where: { userId } })

    return Promise.all(
      suggestions.map((s) =>
        prisma.careerSuggestion.create({
          data: {
            userId,
            title: s.title,
            skillsRequired: Array.isArray(s.skillsRequired)
              ? JSON.stringify(s.skillsRequired)
              : s.skillsRequired || '',
            summary: s.summary,
            salaryGuideline: s.salaryGuideline || null,
            nextSteps: s.nextSteps || null,
            confidenceScore: s.confidenceScore || null,
            verificationPlan: s.verificationPlan || null,
          },
        })
      )
    )
  }

  private hashInputs(query?: string, resumeText?: string): string {
    const combined = `${query || 'default'}::${resumeText ? resumeText.slice(0, 1000) : 'no-resume'}`
    return Buffer.from(combined).toString('base64').substring(0, 32)
  }

  private prepareResumeContext(resumeText: string): string {
    const cleaned = resumeText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (!cleaned) return ''

    const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean)
    const trimmed = lines.slice(0, 40).join('\n')
    return trimmed.length > 1500 ? trimmed.slice(0, 1500) : trimmed
  }

  /**
   * Get user's career suggestions
   */
  async getUserSuggestions(userId: string, limit: number = 10) {
    return prisma.careerSuggestion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}

export const careerService = new CareerService()






