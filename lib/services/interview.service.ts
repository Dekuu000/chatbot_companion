/**
 * Interview Service
 * Handles interview question generation and scoring
 */

import { prisma } from '../prisma'
import { aiClient } from '../ai/client'
import { stripInternalThought } from '../ai/chat-response'

export interface InterviewQuestion {
  question: string
  difficulty: 'easy' | 'medium' | 'hard'
  guidelines: string
  category?: string
}

export interface InterviewResponse {
  questionId: string
  answer: string
  audioUrl?: string
}

export interface InterviewScore {
  questionId: string
  score: number // 0-100
  feedback: string
  strengths: string[]
  weaknesses: string[]
}

export interface InterviewSessionResult {
  overallScore: number
  scores: InterviewScore[]
  feedback: string
  strengths: string[]
  areasForImprovement: string[]
}

export class InterviewService {
  private parseJsonContent<T>(raw: string): T {
    const trimmed = raw.trim()
    const withoutFence = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
      : trimmed

    const tryParse = (text: string): T => {
      return JSON.parse(text) as T
    }

    try {
      return tryParse(withoutFence)
    } catch {
      const start = withoutFence.indexOf('{')
      const end = withoutFence.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        const subset = withoutFence.slice(start, end + 1)
        return tryParse(subset)
      }
      throw new Error('Failed to parse JSON content from AI response')
    }
  }

  /**
   * Generate interview questions
   */
  async generateQuestions(
    jobTitle: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<InterviewQuestion[]> {
    const difficultyMap = {
      easy: 'Beginner level - basic questions about experience and interest',
      medium: 'Intermediate level - behavioral and technical questions',
      hard: 'Advanced level - complex scenarios and problem-solving questions',
    }

    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content: 'You are an interview preparation assistant. Generate relevant interview questions based on job titles and difficulty levels.',
        },
        {
          role: 'user',
          content: `Generate 5 interview questions for a ${jobTitle} position at ${difficultyMap[difficulty]} difficulty level. 

For each question, provide:
- question: The interview question
- difficulty: "${difficulty}"
- guidelines: Detailed answer guidelines (use STAR method for behavioral questions)
- category: "behavioral" | "technical" | "situational"

Respond with a JSON object containing an array called "questions".`,
        },
      ],
      {
        temperature: 0.7,
        cache: true,
        cacheTTL: 3600, // Cache for 1 hour
      }
    )

    try {
      const parsed = this.parseJsonContent<{ questions: any[] }>(response.content)
      let questions = parsed.questions || []

      if (!Array.isArray(questions)) {
        questions = [questions]
      }

      return questions.map((q: any) => ({
        question: q.question || '',
        difficulty: q.difficulty || difficulty,
        guidelines: q.guidelines || '',
        category: q.category || 'general',
      }))
    } catch {
      throw new Error('Failed to parse interview questions')
    }
  }

  /**
   * Create interview session
   */
  async createSession(
    userId: string,
    jobTitle: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ) {
    let questions: InterviewQuestion[]
    try {
      questions = await this.generateQuestions(jobTitle, difficulty)
    } catch (error) {
      console.warn('interview_generate_fallback', error)
      questions = this.buildFallbackQuestions(jobTitle, difficulty)
    }

    return prisma.interviewSession.create({
      data: {
        userId,
        jobTitle,
        difficulty,
        questions: questions as any,
      },
    })
  }

  private buildFallbackQuestions(
    jobTitle: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): InterviewQuestion[] {
    const title = jobTitle || 'your target role'
    const baseQuestions = [
      {
        question: `What motivates you to pursue a ${title} role, and how have you prepared for it so far?`,
        guidelines:
          'Share a short story that highlights your interest, mention 1-2 experiences or projects, and connect them to why the company/team benefits.',
        difficulty: 'easy' as const,
        category: 'behavioral',
      },
      {
        question: `Tell me about a time you faced a tough challenge while working on a project relevant to ${title}. How did you handle it?`,
        guidelines:
          'Use the STAR method: Situation, Task, Action, Result. Focus on your role, the skills you applied, and what changed at the end.',
        difficulty: 'medium' as const,
        category: 'situational',
      },
      {
        question: `Walk me through a key skill required for ${title}. How have you practiced or applied it recently?`,
        guidelines:
          'Explain why the skill matters, describe hands-on practice (project, internship, volunteer work), and highlight the outcome or lesson learned.',
        difficulty: 'medium' as const,
        category: 'technical',
      },
      {
        question: `How do you keep your ${title} knowledge up to date, and what is one learning goal for the next three months?`,
        guidelines:
          'Mention specific communities, courses, or resources you follow; describe how you apply new learnings; share a realistic short-term goal.',
        difficulty: 'medium' as const,
        category: 'behavioral',
      },
      {
        question: `Imagine you just joined a team as a ${title}. What would you do in your first 30 days to create momentum?`,
        guidelines:
          'Lay out a structured plan: how you learn current processes, align with teammates or stakeholders, contribute quick wins, and measure progress.',
        difficulty: 'hard' as const,
        category: 'situational',
      },
    ]

    return baseQuestions.map((q) => ({
      ...q,
      difficulty: difficulty === 'easy' ? 'easy' : q.difficulty,
    }))
  }

  /**
   * Score interview responses
   */
  async scoreInterview(
    sessionId: string,
    responses: InterviewResponse[]
  ): Promise<InterviewSessionResult> {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      throw new Error('Interview session not found')
    }

    const questions = session.questions as any as InterviewQuestion[]

    // Score each response using AI
    const scores = await Promise.all(
      responses.map((response, index) =>
        this.scoreResponse(questions[index], response, session.jobTitle)
      )
    )

    // Calculate overall score
    const overallScore =
      scores.reduce((sum, s) => sum + s.score, 0) / scores.length

    // Generate overall feedback
    const feedback = await this.generateOverallFeedback(
      session.jobTitle,
      questions,
      responses,
      scores
    )

    // Update session
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        responses: responses as any,
        scores: scores as any,
        overallScore,
        feedback,
        completedAt: new Date(),
      },
    })

    return {
      overallScore,
      scores,
      feedback,
      strengths: this.extractStrengths(scores),
      areasForImprovement: this.extractWeaknesses(scores),
    }
  }

  /**
   * Score a single response
   */
  private async scoreResponse(
    question: InterviewQuestion,
    response: InterviewResponse,
    jobTitle: string
  ): Promise<InterviewScore> {
    const rawAnswer = (response.answer || '').trim()

    if (!isMeaningfulAnswer(rawAnswer)) {
      return {
        questionId: response.questionId || question.question,
        score: 0,
        feedback:
          'It looks like this answer is incomplete. Share a short story, highlight the skills you used, and connect it to the role so I can score it accurately.',
        strengths: [],
        weaknesses: ['Answer was too short or unclear to evaluate.'],
      }
    }

    const aiResponse = await aiClient.chat(
      [
        {
          role: 'system',
          content: 'You are an interview evaluator. Score interview answers and provide constructive feedback.',
        },
        {
          role: 'user',
          content: `Evaluate this interview answer:

Question: ${question.question}
Guidelines: ${question.guidelines}
Answer: ${response.answer}
Job Title: ${jobTitle}

Provide a JSON response with:
- score: number (0-100)
- feedback: string (constructive feedback)
- strengths: array of strings
- weaknesses: array of strings`,
        },
      ],
      {
        temperature: 0.3, // Lower temperature for consistent scoring
      }
    )

    try {
      const parsed = this.parseJsonContent<{
        score?: number
        feedback?: string
        strengths?: string[]
        weaknesses?: string[]
      }>(aiResponse.content)
      return {
        questionId: response.questionId || question.question,
        score: parsed.score || 50,
        feedback: formatFeedbackMessage(parsed.feedback || ''),
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
      }
    } catch {
      return {
        questionId: response.questionId || question.question,
        score: 50,
        feedback: 'Unable to evaluate response',
        strengths: [],
        weaknesses: [],
      }
    }
  }

  /**
   * Generate overall feedback
   */
  private async generateOverallFeedback(
    jobTitle: string,
    questions: InterviewQuestion[],
    responses: InterviewResponse[],
    scores: InterviewScore[]
  ): Promise<string> {
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length

    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content: 'You are a career coach providing interview feedback.',
        },
        {
          role: 'user',
          content: `Provide overall interview feedback for a ${jobTitle} position.

Average Score: ${avgScore.toFixed(1)}/100

Summary of responses and scores:
${scores.map((s, i) => `Q${i + 1}: Score ${s.score}/100 - ${s.feedback}`).join('\n')}

Provide constructive, actionable feedback.`,
        },
      ],
      {
        temperature: 0.7,
      }
    )

    return formatFeedbackMessage(response.content)
  }

  private extractStrengths(scores: InterviewScore[]): string[] {
    const allStrengths: string[] = []
    scores.forEach((s) => {
      allStrengths.push(...s.strengths)
    })
    return Array.from(new Set(allStrengths))
  }

  private extractWeaknesses(scores: InterviewScore[]): string[] {
    const allWeaknesses: string[] = []
    scores.forEach((s) => {
      allWeaknesses.push(...s.weaknesses)
    })
    return Array.from(new Set(allWeaknesses))
  }
}

export const interviewService = new InterviewService()

function formatFeedbackMessage(raw: string): string {
  const cleaned = stripInternalThought(raw || '').trim()
  if (!cleaned) return ''

  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned)
      const parts: string[] = []

      if (parsed && typeof parsed === 'object') {
        const maybeScore = typeof parsed.score === 'number' ? parsed.score : undefined
        const mainFeedback =
          typeof parsed.feedback === 'string'
            ? parsed.feedback
            : typeof parsed.message === 'string'
            ? parsed.message
            : undefined

        if (mainFeedback) {
          parts.push(mainFeedback.trim())
        }

        if (Array.isArray(parsed.strengths) && parsed.strengths.length) {
          parts.push(
            `Strengths:\n${parsed.strengths
              .filter((item: unknown): item is string => typeof item === 'string')
              .map((item: string) => `- ${item}`)
              .join('\n')}`
          )
        }

        if (Array.isArray(parsed.weaknesses) && parsed.weaknesses.length) {
          parts.push(
            `Areas to Improve:\n${parsed.weaknesses
              .filter((item: unknown): item is string => typeof item === 'string')
              .map((item: string) => `- ${item}`)
              .join('\n')}`
          )
        }

        if (maybeScore !== undefined && !Number.isNaN(maybeScore)) {
          parts.unshift(`Score: ${Math.round(maybeScore)}/100`)
        }

        if (parts.length) {
          return parts.join('\n\n')
        }
      }
    } catch {
      // fall through to returning cleaned text below
    }
  }

  return summarizeText(cleaned)
}

function isMeaningfulAnswer(answer: string): boolean {
  const trimmed = answer.trim()
  if (trimmed.length < 25) return false

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 5) return false

  const alphabeticChars = trimmed.replace(/[^a-zA-Z]/g, '')
  if (!alphabeticChars) return false

  const uniqueChars = new Set(alphabeticChars.toLowerCase())
  if (uniqueChars.size <= 4) return false

  const vowelCount = (alphabeticChars.match(/[aeiou]/gi) || []).length
  if (vowelCount < 3) return false

  return true
}

function summarizeText(text: string): string {
  const withoutMarkdown = text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/[_`]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  const sentences = withoutMarkdown.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 4) {
    return withoutMarkdown
  }

  return sentences.slice(0, 4).join(' ')
}

