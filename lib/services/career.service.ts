/**
 * Career Service
 * Business logic for career suggestions
 */

import { prisma } from '../prisma'
import { aiClient } from '../ai/client'
import { buildProfileContext } from '../utils/profile-context'
import { Profile } from '@prisma/client'
import {
  describeMarketSnapshot,
  listLearningTracks,
  listRecommendedProjects,
  listRoleInsights,
  RoleInsight,
} from '../content/ph-knowledge'
import { analyticsService } from './analytics.service'
import type { ChatMessage } from '../ai/client'

export interface CareerSuggestionInput {
  title: string
  skillsRequired: string | string[]
  summary: string
  salaryGuideline?: string
  nextSteps?: string
  confidenceScore?: number
  verificationPlan?: string
}

interface ResumeSignals {
  skills: string[]
  certifications: string[]
  projects: string[]
  experiences: string[]
}

interface SuggestionPromptMeta {
  focusRole: string | null
  relevantRoles: string[]
}

interface SuggestionPrompt {
  messages: ChatMessage[]
  meta: SuggestionPromptMeta
}

interface SuggestionMeta extends SuggestionPromptMeta {
  model?: string
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
}

export class CareerService {
  /**
   * Generate career suggestions for a user
   *
    * NOTE: This pipeline is intentionally AI-only. We do not maintain static or fallback
    * mappings—every invocation calls the LLM with the latest profile, resume, and query data.
    * If the model fails we surface the error to the caller so the UI can prompt the user to retry.
   */
  async suggestCareers(userId: string, query?: string, resumeText?: string): Promise<any[]> {
    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    // Build profile context
    const profileContext = buildProfileContext(profile, {
      format: 'brief',
      includeGoals: true,
    })

    const startedAt = Date.now()

    try {
      const { suggestions, meta } = await this.generateSuggestions(profile, query, profileContext, resumeText)
      const persisted = await this.saveSuggestions(userId, suggestions)

      const durationMs = Date.now() - startedAt

      if (meta.model) {
        await analyticsService.trackAICall(
          process.env.AI_PROVIDER || 'perplexity',
          meta.model,
          userId,
          meta.tokenUsage?.total,
          durationMs
        )
      }

      await analyticsService.trackEvent({
        userId,
        action: 'career_suggestions_generated',
        metadata: {
          count: persisted.length,
          focusRole: meta.focusRole,
          relevantRoles: meta.relevantRoles,
          query,
          durationMs,
          titles: persisted.map((item) => item.title),
        },
      })

      return persisted
    } catch (error) {
      console.error('career_suggestions_generation_error', error)
      throw error
    }
  }

  /**
   * Generate suggestions using AI
   */
  private async generateSuggestions(
    profile: Profile,
    query: string | undefined,
    profileContext: string,
    resumeText?: string
  ): Promise<{ suggestions: CareerSuggestionInput[]; meta: SuggestionMeta }> {
    // The prompt builder ensures the model receives structured context plus PH market intel.
    // The LLM must return JSON that maps directly to our `CareerSuggestionInput` schema.
    const { messages, meta: promptMeta } = this.buildSuggestionPrompt({
      profile,
      profileContext,
      query,
      resumeText,
    })

    const response = await aiClient.chat(messages, {
      temperature: 0.6,
      cache: false,
    })

    try {
      const content = this.normalizeAiContent(response.content)
      const parsed = JSON.parse(content)
      let suggestions = parsed.suggestions || parsed.matches || parsed.careers || []

      if (!Array.isArray(suggestions)) {
        suggestions = [suggestions]
      }

      const mapped = suggestions
        .map((s: any) => {
          const skillsArray = Array.isArray(s.skillsToSharpen)
            ? s.skillsToSharpen
            : Array.isArray(s.skillsRequired)
              ? s.skillsRequired
              : typeof s.skillsToSharpen === 'string'
                ? s.skillsToSharpen.split(/[,•;]/).map((x: string) => x.trim())
                : typeof s.skillsRequired === 'string'
                  ? s.skillsRequired.split(/[,•;]/).map((x: string) => x.trim())
                  : []

          const confidenceValue =
            typeof s.confidence === 'number'
              ? s.confidence
              : typeof s.fitScore === 'number'
                ? s.fitScore
                : typeof s.score === 'number'
                  ? s.score
                  : null

          return {
            title: s.title || s.role || 'Career Match',
            skillsRequired: skillsArray,
            summary: s.summary || s.description || s.fitReason || '',
            salaryGuideline: s.phSalaryRange || s.salaryRange || s.salaryGuideline || null,
            nextSteps: s.nextStep || s.upskillingProject || s.project || null,
            confidenceScore: confidenceValue,
            verificationPlan: s.projectRecommendation || s.marketContext || s.fitReason || null,
          } satisfies CareerSuggestionInput
        })
        .filter((item: CareerSuggestionInput) => item.title && item.summary)

      return {
        suggestions: mapped,
        meta: {
          ...promptMeta,
          model: response.model,
          tokenUsage: response.usage
            ? {
                prompt: response.usage.promptTokens || 0,
                completion: response.usage.completionTokens || 0,
                total: response.usage.totalTokens || 0,
              }
            : undefined,
        },
      }
    } catch (error) {
      console.error('Failed to parse career suggestions:', {
        error,
        preview: response.content?.slice(0, 200),
      })
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

  private parseProfileArray(value: string | null): string[] {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
    return []
  }

  private buildSuggestionPrompt({
    profile,
    profileContext,
    query,
    resumeText,
  }: {
    profile: Profile
    profileContext: string
    query?: string
    resumeText?: string
  }): SuggestionPrompt {
    const profileSkills = this.parseProfileArray(profile.skills)
    const interests = this.parseProfileArray(profile.interests)
    const resumeSummary = resumeText ? this.prepareResumeContext(resumeText).slice(0, 1200) : ''
    const resumeSignals = this.extractResumeSignals(resumeText)
    const focusRole = this.deriveFocusRole(query, profile, resumeSignals)

    const corpus = [
      profileContext,
      query,
      resumeSummary,
      profileSkills.join(' '),
      interests.join(' '),
      resumeSignals.skills.join(' '),
      resumeSignals.projects.join(' '),
      resumeSignals.experiences.join(' '),
      resumeSignals.certifications.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const relevantInsights = this.findRelevantRoleInsights(focusRole, corpus)
    const relevantRoles = relevantInsights.map((insight) => insight.displayName)
    const marketSnapshot = focusRole ? describeMarketSnapshot(focusRole) : null
    const recommendedProjects = focusRole ? listRecommendedProjects(focusRole) : []
    const learningTracks = focusRole ? listLearningTracks(focusRole) : []

    const aggregatedSkills = Array.from(new Set([...profileSkills, ...resumeSignals.skills])).slice(0, 15)

    const marketIntelBlock =
      relevantInsights
        .map(
          (insight) =>
            `${insight.displayName}:\n- Salary Band: ${insight.salaryBand}\n- Hiring Hotspots: ${insight.hiringHotspots
              .slice(0, 2)
              .join(', ')}\n- Top Employers: ${insight.topEmployers.slice(0, 3).join(', ')}`
        )
        .join('\n\n') || 'Use your knowledge of the Philippine tech market to align recommendations.'

    const resumeSignalsBlock = [
      resumeSignals.experiences.length
        ? `Key Experience Lines: ${resumeSignals.experiences.slice(0, 4).join(' | ')}`
        : null,
      resumeSignals.projects.length ? `Projects Mentioned: ${resumeSignals.projects.slice(0, 4).join(' | ')}`
        : null,
      resumeSignals.certifications.length
        ? `Certifications: ${resumeSignals.certifications.slice(0, 4).join(' | ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    const projectsBlock =
      recommendedProjects.length > 0
        ? `Relevant PH Projects: ${recommendedProjects.slice(0, 3).join(' | ')}`
        : ''

    const learningTracksBlock =
      learningTracks.length > 0
        ? `Learning Tracks to cite when helpful: ${learningTracks
            .slice(0, 3)
            .map((item) => `${item.title} (${item.url})`)
            .join(' | ')}`
        : ''

    const systemPrompt = [
      'You are an AI career coach supporting professionals in the Philippines.',
      'Given the user profile and resume context, recommend 3-4 realistic PH job opportunities.',
      'Rules:',
      '- Output ONLY valid JSON using this schema: {"suggestions":[{ "title": string, "summary": string, "skillsToSharpen": string[], "nextStep": string, "phSalaryRange": string, "confidence": number (0-1), "projectRecommendation": string, "fitReason": string }]}',
      '- Titles must be authentic job roles (no restating the user prompt).',
      '- Align every recommendation with the user’s skills, goals, and resume history.',
      '- Salary ranges must use Philippine pesos (₱) and realistic local data.',
      '- Provide concrete next steps or projects that close the user\'s skill gaps.',
      '- Confidence should reflect how well the job matches the user (0.5–0.9 typical).',
      '- Do not include markdown code fences or commentary outside the JSON.',
    ].join('\n')

    const userPrompt = [
      `Profile Context:\n${profileContext.trim()}`,
      `Education Level: ${profile.educationLevel || 'not specified'}`,
      `Current Year/Status: ${profile.currentYear || 'not specified'}`,
      `Primary Interests: ${interests.length ? interests.join(', ') : 'none recorded'}`,
      `Profile Skills: ${profileSkills.length ? profileSkills.join(', ') : 'none recorded'}`,
      `Aggregated Skills (profile + resume): ${aggregatedSkills.length ? aggregatedSkills.join(', ') : 'not captured'}`,
      `Career Goals: ${profile.goals || 'not specified'}`,
      `Session Query: ${query?.trim() || 'user did not provide additional prompt'}`,
      `Derived Target Role: ${focusRole || 'undetermined'}`,
      resumeSummary ? `Resume Highlights:\n${resumeSummary}` : 'Resume Highlights: none uploaded',
      resumeSignalsBlock ? `Resume Signals:\n${resumeSignalsBlock}` : 'Resume Signals: none detected',
      `PH Market Snapshot:\n${marketSnapshot || 'Leverage current PH market patterns from your knowledge.'}`,
      `Relevant PH Role Insights:\n${marketIntelBlock}`,
      projectsBlock,
      learningTracksBlock,
      'Generate the JSON response now.',
    ]
      .filter(Boolean)
      .join('\n\n')

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      meta: {
        focusRole,
        relevantRoles,
      },
    }
  }

  private extractResumeSignals(resumeText?: string): ResumeSignals {
    const empty: ResumeSignals = { skills: [], certifications: [], projects: [], experiences: [] }
    if (!resumeText) return empty

    const lines = resumeText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const skillTokens = new Set<string>()
    const certifications: string[] = []
    const projects: string[] = []
    const experiences: string[] = []

    const skillMatches = Array.from(resumeText.matchAll(/skills?(?:\s*[:\-]\s*)([^\n]+)/gi))
    skillMatches.forEach((match) => {
      match[1]
        .split(/[,;•|]/)
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((token) => {
          if (token.length <= 40) {
            skillTokens.add(token)
          }
        })
    })

    for (const line of lines) {
      const lower = line.toLowerCase()
      if (certifications.length < 5 && /certification|certified|certificate/.test(lower)) {
        certifications.push(line)
        continue
      }
      if (projects.length < 5 && /project|built|developed|created|capstone/.test(lower)) {
        projects.push(line)
        continue
      }
      if (experiences.length < 5 && /experience|managed|led|engineer|analyst|developer|technician|specialist/.test(lower)) {
        experiences.push(line)
      }

      if (
        skillTokens.size < 20 &&
        (line.includes('•') || line.includes('-') || line.includes(',')) &&
        /javascript|node|react|sql|python|design|ux|analytics|aws|cloud|security|support|typescript|java|c#|php|figma/i.test(
          line
        )
      ) {
        line
          .split(/[,;•|]/)
          .map((token) => token.trim())
          .filter((token) => token && token.length <= 35)
          .forEach((token) => skillTokens.add(token))
      }
    }

    return {
      skills: Array.from(skillTokens).slice(0, 20),
      certifications,
      projects,
      experiences,
    }
  }

  private deriveFocusRole(query: string | undefined, profile: Profile, resumeSignals: ResumeSignals): string | null {
    const insights = listRoleInsights()
    const sources = [
      query,
      profile.goals,
      resumeSignals.projects.join(' '),
      resumeSignals.experiences.join(' '),
      resumeSignals.skills.join(' '),
    ]
    const corpus = sources
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    let bestMatch: { role: string; display: string; score: number } | null = null
    insights.forEach((insight) => {
      const roleKey = insight.role
      const displayKey = insight.displayName.toLowerCase()
      let score = 0

      if (corpus.includes(displayKey)) score += 4
      if (corpus.includes(roleKey)) score += 3
      insight.displayName
        .toLowerCase()
        .split(' ')
        .forEach((token) => {
          if (token.length > 3 && corpus.includes(token)) {
            score += 0.5
          }
        })

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { role: roleKey, display: insight.displayName, score }
      }
    })

    if (bestMatch !== null && bestMatch.score >= 3) {
      return bestMatch.display
    }

    const keywordRoleMap: Record<string, string> = {
      backend: 'Software Engineer',
      'back-end': 'Software Engineer',
      'full stack': 'Software Engineer',
      'full-stack': 'Software Engineer',
      frontend: 'Software Engineer',
      'front-end': 'Software Engineer',
      'data analyst': 'Data Analyst',
      analytics: 'Data Analyst',
      'data science': 'Data Analyst',
      ux: 'UX / Product Designer',
      'ui/ux': 'UX / Product Designer',
      designer: 'UX / Product Designer',
      'product manager': 'Product Manager',
      'product management': 'Product Manager',
      cyber: 'Cybersecurity Analyst',
      security: 'Cybersecurity Analyst',
      'customer support': 'Customer Service / BPO Specialist',
      'customer service': 'Customer Service / BPO Specialist',
      bpo: 'Customer Service / BPO Specialist',
    }

    for (const [keyword, mappedRole] of Object.entries(keywordRoleMap)) {
      if (corpus.includes(keyword)) {
        return mappedRole
      }
    }

    const interests = this.parseProfileArray(profile.interests)
    if (interests.length) {
      const firstInterest = interests[0].toLowerCase()
      const match = insights.find(
        (insight) =>
          firstInterest.includes(insight.role) || firstInterest.includes(insight.displayName.toLowerCase())
      )
      if (match) return match.displayName
    }

    return profile.goals || null
  }

  private findRelevantRoleInsights(focusRole: string | null, corpus: string): RoleInsight[] {
    const insights = listRoleInsights()
    const scored = insights.map((insight) => {
      let score = 0
      const focus = focusRole ? focusRole.toLowerCase() : ''
      if (focus && (insight.displayName.toLowerCase() === focus || insight.role === focus)) {
        score += 6
      }

      if (corpus.includes(insight.displayName.toLowerCase())) score += 2
      if (corpus.includes(insight.role)) score += 2

      insight.displayName
        .toLowerCase()
        .split(' ')
        .forEach((token) => {
          if (token.length > 3 && corpus.includes(token)) {
            score += 0.5
          }
        })

      return { insight, score }
    })

    const selected: typeof insights = []
    scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .forEach((entry) => {
        if (!selected.some((item) => item.role === entry.insight.role) && selected.length < 3) {
          selected.push(entry.insight)
        }
      })

    if (selected.length < 3) {
      insights.some((insight) => {
        if (!selected.some((item) => item.role === insight.role)) {
          selected.push(insight)
        }
        return selected.length === 3
      })
    }

    return selected
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

  private normalizeAiContent(raw: string): string {
    if (!raw) return ''
    let content = raw.trim()

    // Remove Perplexity <think>...</think> blocks
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    // Strip leading/trailing code fences
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()

    return content
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






