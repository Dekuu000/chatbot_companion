/**
 * Quiz Service
 * Handles career profiling quiz logic
 */

import { prisma } from '../prisma'
import { aiClient } from '../ai/client'

export interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'rating' | 'text'
  options?: string[]
  required: boolean
}

export interface QuizResponse {
  questionId: string
  answer: string | number | string[]
}

export interface QuizResult {
  skills: string[]
  interests: string[]
  personalityTraits: string[]
  recommendedCareers: string[]
  confidence: number
}

export class QuizService {
  /**
   * Get quiz questions by type
   */
  async getQuizQuestions(quizType: 'skills' | 'interests' | 'personality'): Promise<QuizQuestion[]> {
    // Generate questions using AI (or use predefined questions)
    const prompt = this.getQuizPrompt(quizType)

    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content: 'You are a career assessment expert. Generate quiz questions for career profiling.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        responseFormat: 'json_object',
        temperature: 0.7,
        cache: true,
        cacheTTL: 86400, // Cache for 24 hours
      }
    )

    try {
      const parsed = JSON.parse(response.content)
      return parsed.questions || this.getDefaultQuestions(quizType)
    } catch {
      return this.getDefaultQuestions(quizType)
    }
  }

  /**
   * Submit quiz responses and calculate results
   */
  async submitQuiz(
    userId: string,
    quizType: 'skills' | 'interests' | 'personality',
    responses: QuizResponse[]
  ): Promise<QuizResult> {
    // Calculate results using AI
    const results = await this.calculateResults(quizType, responses)

    // Save to database
    await prisma.quizResponse.create({
      data: {
        userId,
        quizType,
        responses: responses as any,
        results: results as any,
      },
    })

    // Update user profile if skills/interests quiz
    if (quizType === 'skills' || quizType === 'interests') {
      await this.updateProfileFromQuiz(userId, quizType, results)
    }

    return results
  }

  /**
   * Calculate quiz results using AI
   */
  private async calculateResults(
    quizType: string,
    responses: QuizResponse[]
  ): Promise<QuizResult> {
    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content: 'You are a career assessment expert. Analyze quiz responses and provide structured results.',
        },
        {
          role: 'user',
          content: `Analyze these ${quizType} quiz responses and provide results:
${JSON.stringify(responses, null, 2)}

Respond with JSON: {
  "skills": ["skill1", "skill2"],
  "interests": ["interest1", "interest2"],
  "personalityTraits": ["trait1", "trait2"],
  "recommendedCareers": ["career1", "career2"],
  "confidence": 0.85
}`,
        },
      ],
      {
        responseFormat: 'json_object',
        temperature: 0.5,
      }
    )

    try {
      return JSON.parse(response.content) as QuizResult
    } catch {
      // Fallback results
      return {
        skills: [],
        interests: [],
        personalityTraits: [],
        recommendedCareers: [],
        confidence: 0.5,
      }
    }
  }

  /**
   * Update user profile from quiz results
   */
  private async updateProfileFromQuiz(
    userId: string,
    quizType: string,
    results: QuizResult
  ): Promise<void> {
    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) return

    const updates: any = {}

    if (quizType === 'skills' && results.skills.length > 0) {
      const existingSkills = JSON.parse(profile.skills || '[]')
      const combined = Array.from(new Set([...existingSkills, ...results.skills]))
      updates.skills = JSON.stringify(combined)
    }

    if (quizType === 'interests' && results.interests.length > 0) {
      const existingInterests = JSON.parse(profile.interests || '[]')
      const combined = Array.from(new Set([...existingInterests, ...results.interests]))
      updates.interests = JSON.stringify(combined)
    }

    if (Object.keys(updates).length > 0) {
      await prisma.profile.update({
        where: { userId },
        data: updates,
      })
    }
  }

  private getQuizPrompt(quizType: string): string {
    const prompts: Record<string, string> = {
      skills: 'Generate 10 multiple-choice questions to assess technical and soft skills. Include questions about programming, communication, problem-solving, etc.',
      interests: 'Generate 10 questions to assess career interests and preferences. Include questions about work environment, industry preferences, etc.',
      personality: 'Generate 10 questions to assess personality traits relevant to career fit. Use rating scales (1-5).',
    }
    return prompts[quizType] || prompts.skills
  }

  private getDefaultQuestions(quizType: string): QuizQuestion[] {
    // Fallback questions if AI fails
    if (quizType === 'skills') {
      return [
        {
          id: '1',
          question: 'How would you rate your programming skills?',
          type: 'rating',
          required: true,
        },
        {
          id: '2',
          question: 'Which programming languages are you familiar with?',
          type: 'multiple-choice',
          options: ['Python', 'JavaScript', 'Java', 'C++', 'Other'],
          required: true,
        },
      ]
    }
    return []
  }
}

export const quizService = new QuizService()

