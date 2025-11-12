/**
 * Dashboard Overview API Route
 * GET /api/dashboard/overview?userId=xxx
 *
 * Aggregates profile status, recent activity, and actionable insights
 * so the dashboard can render a personalised experience without
 * juggling multiple endpoint calls on the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLocalizedResources, describeMarketSnapshot } from '@/lib/content/ph-knowledge'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_ACTIVITY_ITEMS = 12
const MAX_COACH_TIPS = 5
const MAX_RESUME_LENGTH = 3
const MAX_INTERVIEW_ITEMS = 5
const MAX_LEARNING_RESOURCES = 6
const MAX_ROADMAP_ITEMS = 6

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseCareerSkills(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const fromJson = JSON.parse(value)
    if (Array.isArray(fromJson)) return fromJson.map((item) => String(item))
  } catch {
    /* ignore JSON parse errors and fall back to comma split */
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function computeProfileCompletion(profile: any, resumeCount: number) {
  const skills = parseJsonArray<string>(profile.skills)
  const interests = parseJsonArray<string>(profile.interests)
  const checkpoints = [
    { key: 'skills', label: 'Key skills', completed: skills.length > 0 },
    { key: 'interests', label: 'Career interests', completed: interests.length > 0 },
    { key: 'educationLevel', label: 'Education', completed: Boolean(profile.educationLevel) },
    { key: 'goals', label: 'Career goals', completed: Boolean(profile.goals) },
    { key: 'resume', label: 'Resume uploaded', completed: resumeCount > 0 },
  ]

  const completedSections = checkpoints.filter((item) => item.completed).map((item) => item.label)
  const missingSections = checkpoints.filter((item) => !item.completed).map((item) => item.label)
  const percent = Math.round((completedSections.length / checkpoints.length) * 100)

  return {
    percent,
    completedSections,
    missingSections,
  }
}

function mapActivityItem(params: {
  id: string
  type: string
  title: string
  description?: string | null
  timestamp: Date
  href?: string
}) {
  return {
    id: params.id,
    type: params.type,
    title: params.title,
    description: params.description ?? '',
    timestamp: params.timestamp.toISOString(),
    href: params.href,
  }
}

function buildFallbackCoachTips(profileFirstName: string) {
  return [
    {
      id: 'coach-default-1',
      title: 'Sharpen one portfolio project this week',
      description: 'Pick a project that reflects your target role and rewrite the problem, approach, and outcome so it resonates with recruiters.',
      actionText: 'Open Projects',
      actionUrl: '/projects',
    },
    {
      id: 'coach-default-2',
      title: 'Schedule a mock interview',
      description: `${profileFirstName}, practicing out loud helps you tighten storytelling. Aim for one behavioural and one technical question tonight.`,
      actionText: 'Practice now',
      actionUrl: '/interview',
    },
  ]
}

function buildFallbackRoadmap() {
  return [
    {
      id: 'roadmap-1',
      title: 'Clarify your focus',
      status: 'completed',
      description: 'Define the roles and industries you’re targeting and capture them inside your profile.',
      progress: 100,
    },
    {
      id: 'roadmap-2',
      title: 'Polish your resume',
      status: 'in_progress',
      description: 'Upload your latest resume for AI feedback and implement the top two improvements.',
      progress: 55,
    },
    {
      id: 'roadmap-3',
      title: 'Build an interview rhythm',
      status: 'up_next',
      description: 'Schedule two interview practice sessions and note the main stories you want to highlight.',
      progress: 10,
    },
  ]
}

async function handleOverview(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [profile, user, suggestions, resumeRecords, interviews, recommendations, auditLogs, latestConversation] = await Promise.all([
      ensureProfile(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true },
      }),
      careerService.getUserSuggestions(userId, 12),
      prisma.resume.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_RESUME_LENGTH,
        select: {
          id: true,
          fileName: true,
          overallScore: true,
          improvementSuggestions: true,
          createdAt: true,
          analysisResult: true,
        },
      }),
      prisma.interviewSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_INTERVIEW_ITEMS,
        select: {
          id: true,
          jobTitle: true,
          difficulty: true,
          overallScore: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.recommendation.findMany({
        where: { userId },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_ACTIVITY_ITEMS,
      }),
      prisma.conversation.findFirst({
        where: {
          userId,
          archived: false,
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
    ])

    const resumeCount = resumeRecords.length
    const completion = computeProfileCompletion(profile, resumeCount)
    const skillsArray = parseJsonArray<string>(profile.skills)
    const greetingName =
      user?.username ||
      (user?.email ? user.email.split('@')[0] : null) ||
      'there'

    const formattedSuggestions = suggestions
      .slice()
      .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0))
      .map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      summary: suggestion.summary,
      salaryGuideline: suggestion.salaryGuideline,
      nextSteps: suggestion.nextSteps,
      verificationPlan: suggestion.verificationPlan,
      confidenceScore: suggestion.confidenceScore,
      skills: parseCareerSkills(suggestion.skillsRequired),
      createdAt: suggestion.createdAt?.toISOString?.() ?? new Date().toISOString(),
      }))

    const activityItems = [
      ...resumeRecords.map((resume) =>
        mapActivityItem({
          id: `resume-${resume.id}`,
          type: 'resume',
          title: 'Resume uploaded',
          description: resume.fileName,
          timestamp: resume.createdAt,
          href: '/resume',
        })
      ),
      ...interviews.map((interview) =>
        mapActivityItem({
          id: `interview-${interview.id}`,
          type: 'interview',
          title: `Interview practice: ${interview.jobTitle}`,
          description: interview.overallScore ? `Scored ${Math.round(interview.overallScore)}/100` : 'Session in progress',
          timestamp: interview.completedAt ?? interview.createdAt,
          href: `/interview?sessionId=${interview.id}`,
        })
      ),
      ...formattedSuggestions.map((suggestion) =>
        mapActivityItem({
          id: `suggestion-${suggestion.id}`,
          type: 'career',
          title: `New match: ${suggestion.title}`,
          description: suggestion.summary,
          timestamp: new Date(suggestion.createdAt),
          href: '/dashboard',
        })
      ),
      ...auditLogs.map((log) =>
        mapActivityItem({
          id: `audit-${log.id}`,
          type: log.entityType || 'activity',
          title: log.action.replace(/_/g, ' '),
          description: log.metadata || '',
          timestamp: log.createdAt,
          href: '/activity',
        })
      ),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_ACTIVITY_ITEMS)

    const resumeInsights = resumeRecords.length
      ? (() => {
          const latestResume = resumeRecords[0]
          let parsedAnalysis: any = null
          try {
            parsedAnalysis = latestResume.analysisResult ? JSON.parse(latestResume.analysisResult) : null
          } catch {
            parsedAnalysis = null
          }
          const parsedSuggestions = parseJsonArray<{ area: string; suggestion: string; priority: string }>(
            latestResume.improvementSuggestions
          )
          return {
            id: latestResume.id,
            fileName: latestResume.fileName,
            uploadedAt: latestResume.createdAt.toISOString(),
            overallScore: latestResume.overallScore ?? parsedAnalysis?.overallScore ?? null,
            strengths: parsedAnalysis?.strengths ?? [],
            weaknesses: parsedAnalysis?.weaknesses ?? [],
            improvementSuggestions: parsedAnalysis?.improvementSuggestions ?? parsedSuggestions,
            alignment: parsedAnalysis?.careerAlignment ?? null,
            skillsIdentified: parsedAnalysis?.skillsIdentified ?? [],
          }
        })()
      : null

    const coachTips =
      recommendations
        .filter((rec) => ['skill', 'action', 'coach_tip'].includes(rec.type))
        .slice(0, MAX_COACH_TIPS)
        .map((rec) => ({
          id: rec.id,
          title: rec.title,
          description: rec.description ?? '',
          actionText: rec.actionText ?? 'View action',
          actionUrl: rec.actionUrl ?? '#',
          priority: rec.priority,
        })) || []

    let learningResources =
      recommendations
        .filter((rec) => ['resource', 'course', 'learning'].includes(rec.type))
        .slice(0, MAX_LEARNING_RESOURCES)
        .map((rec) => ({
          id: rec.id,
          title: rec.title,
          description: rec.description ?? '',
          category: rec.category,
          actionText: rec.actionText ?? 'Open resource',
          actionUrl: rec.actionUrl ?? '#',
        })) || []

    const roadmapItems =
      recommendations
        .filter((rec) => ['action_plan', 'roadmap'].includes(rec.type))
        .slice(0, MAX_ROADMAP_ITEMS)
        .map((rec) => {
          const state = (rec.metadata ? (() => {
            try {
              const parsed = JSON.parse(rec.metadata)
              return parsed
            } catch {
              return {}
            }
          })() : {}) as Record<string, any>
          const status = state.status ?? (rec.completed ? 'completed' : rec.viewed ? 'in_progress' : 'up_next')
          const progress = typeof state.progress === 'number' ? state.progress : status === 'completed' ? 100 : status === 'in_progress' ? 50 : 10
          return {
            id: rec.id,
            title: rec.title,
            description: rec.description ?? '',
            status,
            progress,
          }
        })

    const parsedConversationTags = latestConversation
      ? parseConversationTags((latestConversation as any)?.contextTags ?? null)
      : null
    const focusContext = (() => {
      const targetRole = parsedConversationTags?.targetRole ?? profile.goals?.trim() ?? null
      if (!targetRole && !parsedConversationTags) return null
      
      // Determine the source of targetRole to set accurate timestamp
      const isFromProfile = !parsedConversationTags?.targetRole && profile.goals?.trim()
      
      return {
        targetRole,
        intent: parsedConversationTags?.intent ?? null,
        stage: parsedConversationTags?.stage ?? null,
        goalSummary: parsedConversationTags?.goalSummary ?? profile.goals ?? null,
        updatedAt: isFromProfile
          ? (profile.updatedAt instanceof Date
              ? profile.updatedAt.toISOString()
              : new Date(profile.updatedAt || Date.now()).toISOString())
          : (parsedConversationTags?.updatedAt ??
              latestConversation?.lastMessageAt?.toISOString?.() ??
              new Date().toISOString()),
        marketSnapshot: describeMarketSnapshot(targetRole),
      }
    })()

    if (!learningResources.length) {
      const localizedResources = getLocalizedResources({
        role: focusContext?.targetRole ?? profile.goals ?? null,
        stage: focusContext?.stage ?? null,
        limit: MAX_LEARNING_RESOURCES,
      })
      if (localizedResources.length) {
        learningResources = localizedResources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description,
          category: resource.category,
          actionText: 'Explore resource',
          actionUrl: resource.url,
        }))
      }
    }

    const responseBody = {
      greetingName,
      profileCompletion: completion,
      stats: {
        matches: formattedSuggestions.length,
        interviewSessions: interviews.length,
        skillsCount: skillsArray.length,
        profileCompletion: completion.percent,
      },
      suggestions: formattedSuggestions,
      activity: activityItems,
      coachTips: coachTips.length ? coachTips : buildFallbackCoachTips(greetingName || 'You'),
      resumeInsights,
      resumes: resumeRecords.map((resume) => ({
        id: resume.id,
        fileName: resume.fileName,
        uploadedAt: resume.createdAt.toISOString(),
        overallScore: resume.overallScore,
      })),
      interviews: interviews.map((interview) => ({
        id: interview.id,
        jobTitle: interview.jobTitle,
        difficulty: interview.difficulty,
        overallScore: interview.overallScore ?? null,
        createdAt: interview.createdAt.toISOString(),
        completedAt: interview.completedAt?.toISOString() ?? null,
      })),
      learningResources,
      roadmap: roadmapItems.length ? roadmapItems : buildFallbackRoadmap(),
      focusContext,
    }

    return NextResponse.json(responseBody, { status: 200 })
  } catch (error) {
    console.error('dashboard_overview_error', error)
    return NextResponse.json({ error: 'Failed to load dashboard overview' }, { status: 500 })
  }
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function GET(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(handleOverview, { skipErrorWrapper: true })
  return handler(request)
}




