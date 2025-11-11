/**
 * Learning Path Service
 * Generates personalized learning paths for career development
 */

import { prisma } from '../prisma'
import { aiClient } from '../ai/client'
import { buildProfileContext } from '../utils/profile-context'

export interface LearningStep {
  id: string
  title: string
  description: string
  type: 'course' | 'project' | 'reading' | 'practice' | 'certification'
  duration: string // e.g., "2 weeks", "1 month"
  resources: string[]
  completed: boolean
  order: number
}

export interface LearningPath {
  id: string
  title: string
  description: string
  careerGoal: string
  steps: LearningStep[]
  progress: number
  completed: boolean
}

export class LearningPathService {
  /**
   * Generate a learning path for a user
   */
  async generateLearningPath(
    userId: string,
    careerGoal: string
  ): Promise<LearningPath> {
    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const profileContext = buildProfileContext(profile)

    // Generate learning path using AI
    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content: 'You are a career development expert. Create personalized learning paths to help users achieve their career goals.',
        },
        {
          role: 'user',
          content: `Create a personalized learning path for this user:

${profileContext}

Career Goal: ${careerGoal}

Generate a structured learning path with 8-12 steps. Each step should have:
- title: Step title
- description: What to learn/do
- type: "course" | "project" | "reading" | "practice" | "certification"
- duration: Estimated time (e.g., "2 weeks")
- resources: Array of resource names/URLs
- order: Step number (1, 2, 3...)

Respond with JSON:
{
  "title": "Learning Path Title",
  "description": "Overview of the learning path",
  "steps": [...]
}`,
        },
      ],
      {
        responseFormat: 'json_object',
        temperature: 0.7,
      }
    )

    try {
      const parsed = JSON.parse(response.content)
      const steps = (parsed.steps || []).map((s: any, index: number) => ({
        id: `step-${index + 1}`,
        title: s.title || `Step ${index + 1}`,
        description: s.description || '',
        type: s.type || 'course',
        duration: s.duration || '1 week',
        resources: Array.isArray(s.resources) ? s.resources : [],
        completed: false,
        order: s.order || index + 1,
      }))

      // Save to database
      const saved = await prisma.learningPath.create({
        data: {
          userId,
          title: parsed.title || `Learning Path for ${careerGoal}`,
          description: parsed.description || '',
          careerGoal,
          steps: steps as any,
          progress: 0,
          completed: false,
        },
      })

      return {
        id: saved.id,
        title: saved.title,
        description: saved.description || '',
        careerGoal: saved.careerGoal,
        steps,
        progress: saved.progress,
        completed: saved.completed,
      }
    } catch (error) {
      console.error('Failed to generate learning path:', error)
      throw new Error('Failed to generate learning path')
    }
  }

  /**
   * Get user's learning paths
   */
  async getUserLearningPaths(userId: string) {
    return prisma.learningPath.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update learning path progress
   */
  async updateProgress(
    pathId: string,
    stepId: string,
    completed: boolean
  ): Promise<void> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
    })

    if (!path) {
      throw new Error('Learning path not found')
    }

    const steps = path.steps as any as LearningStep[]
    const stepIndex = steps.findIndex((s) => s.id === stepId)

    if (stepIndex === -1) {
      throw new Error('Step not found')
    }

    steps[stepIndex].completed = completed

    // Calculate progress
    const completedSteps = steps.filter((s) => s.completed).length
    const progress = completedSteps / steps.length
    const allCompleted = completedSteps === steps.length

    await prisma.learningPath.update({
      where: { id: pathId },
      data: {
        steps: steps as any,
        progress,
        completed: allCompleted,
      },
    })
  }
}

export const learningPathService = new LearningPathService()








