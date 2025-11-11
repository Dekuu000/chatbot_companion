/**
 * Resume Service
 * Handles resume analysis and improvements
 */

import { Resume } from '@prisma/client'
import { getPerplexityHeaders, PERPLEXITY_API_URL, PERPLEXITY_DEFAULT_MODEL } from '@/lib/openai'

export interface ResumeAnalysisResult {
  overallScore: number
  careerAlignment?: {
    matchScore?: number
    careers?: Array<{ title: string; matchScore: number }>
  }
  improvementSuggestions?: Array<{
    area: string
    suggestion: string
    priority: 'high' | 'medium' | 'low'
  }>
  strengths?: string[]
  weaknesses?: string[]
  skillsIdentified?: string[]
}

interface AnalyseOptions {
  profileContext: string
  targetRole?: string | null
  userStage?: string | null
  intent?: string | null
  timeoutMs?: number
  enableFallback?: boolean
}

const DEFAULT_TIMEOUT = 45_000

export async function analyzeResumeWithAI(
  resume: Pick<Resume, 'extractedText'>,
  { profileContext, targetRole, userStage, intent, timeoutMs = DEFAULT_TIMEOUT, enableFallback = true }: AnalyseOptions
): Promise<ResumeAnalysisResult> {
  const resumeText = resume.extractedText || ''
  const effectiveTimeout =
    typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.round(timeoutMs) : DEFAULT_TIMEOUT

  let controller: AbortController | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null

  try {
    const headers = getPerplexityHeaders()
    controller = new AbortController()
    timeout = setTimeout(() => controller?.abort(), effectiveTimeout)

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: PERPLEXITY_DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional resume reviewer and career counselor. Analyse resumes and provide constructive feedback. Always be specific and actionable. Respond with valid JSON only.',
          },
          {
            role: 'user',
            content: `Analyse this resume and provide feedback:

Resume Text:
${resumeText.substring(0, 6000)}${resumeText.length > 6000 ? ' ...(truncated)' : ''}

${profileContext ? `Profile Context:\n${profileContext}\n\n` : ''}
${targetRole ? `Target Role: ${targetRole}\n` : ''}
${userStage ? `User Stage: ${userStage}\n` : ''}
${intent ? `Intent Focus: ${intent}\n` : ''}

Ensure every piece of advice ties back to the target role when available. Call out missing proof of impact and PH market expectations explicitly.
Return a JSON object with:
- overallScore: number (0-100)
- careerAlignment: { matchScore: number, careers: Array<{ title: string, matchScore: number }> }
- improvementSuggestions: Array<{ area: string, suggestion: string, priority: "high" | "medium" | "low" }>
- strengths: string[]
- weaknesses: string[]
- skillsIdentified: string[]`,
          },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const json = await response.json()
    const content = json.choices?.[0]?.message?.content || '{}'
    return JSON.parse(content)
  } catch (error) {
    if (timeout) {
      clearTimeout(timeout)
    }
    if (controller && controller.signal.aborted === false) {
      controller.abort()
    }
    if (enableFallback) {
      console.warn('resume_analysis_fallback', error)
      return buildFallbackResumeAnalysis(resumeText)
    }
    throw error
  }
}

export function buildFallbackResumeAnalysis(resumeText: string): ResumeAnalysisResult {
  const cleaned = resumeText.replace(/\s+/g, ' ').trim()
  const wordCount = cleaned ? cleaned.split(' ').length : 0
  const inferredSkills = Array.from(new Set((cleaned.match(/\b[A-Z][a-z]+\b/g) || []).slice(0, 6)))

  return {
    overallScore: Math.min(65 + Math.round((wordCount % 40) / 2), 78),
    careerAlignment: {
      matchScore: 60,
      careers: [
        { title: 'Career Development Planning', matchScore: 62 },
        { title: 'Skills Refresh & Upskilling Program', matchScore: 58 },
      ],
    },
    improvementSuggestions: [
      {
        area: 'Achievements',
        suggestion: 'Add quantified wins (e.g., “Improved process efficiency by 18%”) so employers see your impact.',
        priority: 'high',
      },
      {
        area: 'Skills Section',
        suggestion: 'Group skills into technical, business, and interpersonal categories to highlight depth and breadth.',
        priority: 'medium',
      },
      {
        area: 'Summary',
        suggestion: 'Include a 2-3 sentence summary describing your target role and unique value proposition.',
        priority: 'low',
      },
    ],
    strengths: [
      wordCount > 350 ? 'Detailed experience descriptions show accountability.' : 'Concise layout keeps information scannable.',
      'Experience entries appear to cover multiple disciplines—leverage that versatility.',
    ],
    weaknesses: [
      'AI reviewer was unavailable, so these tips are template-based—consider refreshing resume after updates.',
      'Ensure your resume highlights your top achievements with metrics and outcomes.',
    ],
    skillsIdentified: inferredSkills.length > 0 ? inferredSkills : ['Stakeholder Communication', 'Project Coordination', 'Problem Solving'],
  }
}

export function formatResumeAnalysisMessage(options: {
  analysis: ResumeAnalysisResult
  resumeName?: string
  userPrompt?: string
}): string {
  const { analysis, resumeName, userPrompt } = options
  const sections: string[] = []

  const headerLines = [`Here’s what I spotted in **${resumeName || 'your resume'}**:`]
  if (analysis.overallScore) {
    headerLines.push(`- **Resume score:** ${analysis.overallScore}/100`)
  }
  if (userPrompt) {
    headerLines.push(`- **Your note:** ${userPrompt}`)
  }
  sections.push(headerLines.join('\n'))

  if (analysis.strengths?.length) {
    sections.push(`**Where you’re strong**\n${analysis.strengths.map((item) => `- ${item}`).join('\n')}`)
  }

  if (analysis.improvementSuggestions?.length) {
    const improvementBullets = analysis.improvementSuggestions.map((s) => `- ${s.area}: ${s.suggestion} (${s.priority} priority)`).join('\n')
    sections.push(`**Opportunities to improve**\n${improvementBullets}`)
  }

  if (analysis.careerAlignment?.careers?.length) {
    const careerBullets = analysis.careerAlignment.careers
      .slice(0, 3)
      .map((c) => `- ${c.title} (match ${c.matchScore}% )`)
      .join('\n')
    sections.push(`**Career paths to explore**\n${careerBullets}`)
  }

  if (analysis.skillsIdentified?.length) {
    sections.push(`**Skills I noticed**\n${analysis.skillsIdentified.map((skill) => `- ${skill}`).join('\n')}`)
  }

  const closing = `Let me know if you’d like a tailored action plan or help drafting bullet points. I’m happy to dive deeper!`
  sections.push(closing)

  return sections.join('\n\n')
}





