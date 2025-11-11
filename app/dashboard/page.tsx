"use client"

import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Bookmark,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Paperclip,
  FileText,
  XCircle,
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
  BarChart3,
  Compass,
  ArrowUpRight,
  CalendarCheck,
  ListChecks,
  Lightbulb,
  type LucideIcon,
} from "lucide-react"

type DashboardTab = "matches" | "resume" | "interview" | "learning" | "activity"

interface FocusContext {
  targetRole: string | null
  intent: string | null
  stage: string | null
  goalSummary: string | null
  updatedAt: string
  marketSnapshot?: string | null
}

interface DashboardOverview {
  greetingName: string
  profileCompletion: ProfileCompletion
  stats: DashboardStats
  suggestions: CareerMatch[]
  activity: ActivityItem[]
  coachTips: CoachTip[]
  resumeInsights: ResumeInsights | null
  resumes: ResumeSummary[]
  interviews: InterviewSummary[]
  learningResources: LearningResource[]
  roadmap: RoadmapMilestone[]
  focusContext: FocusContext | null
}

interface ProfileCompletion {
  percent: number
  completedSections: string[]
  missingSections: string[]
}

interface DashboardStats {
  matches: number
  interviewSessions: number
  skillsCount: number
  profileCompletion: number
}

interface CareerMatch {
  id: string
  title: string
  summary: string
  salaryGuideline?: string | null
  nextSteps?: string | null
  verificationPlan?: string | null
  confidenceScore?: number | null
  skills: string[]
  createdAt: string
}

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  href?: string | null
}

interface CoachTip {
  id: string
  title: string
  description: string
  actionText?: string
  actionUrl?: string
  priority?: number
}

interface ResumeInsights {
  id: string
  fileName: string
  uploadedAt: string
  overallScore: number | null
  strengths?: string[]
  weaknesses?: string[]
  improvementSuggestions?: Array<{ area?: string; suggestion: string; priority?: string }>
  alignment?: {
    matchScore?: number
    careers?: Array<{ title: string; matchScore: number }>
  }
  skillsIdentified?: string[]
}

interface ResumeSummary {
  id: string
  fileName: string
  uploadedAt: string
  overallScore: number | null
}

interface InterviewSummary {
  id: string
  jobTitle: string
  difficulty: string
  overallScore: number | null
  createdAt: string
  completedAt: string | null
}

interface LearningResource {
  id: string
  title: string
  description: string
  category?: string | null
  actionText?: string
  actionUrl?: string
}

interface RoadmapMilestone {
  id: string
  title: string
  description: string
  status: "completed" | "in_progress" | "up_next" | string
  progress: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
  disabled?: boolean
  badge?: string
}

const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
])

const RESUME_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"

const MAX_RESUME_SIZE = 10 * 1024 * 1024

function formatRelativeTime(value: string) {
  const now = Date.now()
  const target = new Date(value).getTime()
  const diff = now - target
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return "just now"
  if (diff < hour) return `${Math.round(diff / minute)}m ago`
  if (diff < day) return `${Math.round(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(target)
}

function getMatchScore(score?: number | null) {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return 68
  }
  if (score > 1) return Math.round(score)
  if (score < 0) return 0
  return Math.round(score * 100)
}

function formatPriorityBadge(priority?: string) {
  switch ((priority || "").toLowerCase()) {
    case "high":
      return "High priority"
    case "medium":
      return "Medium priority"
    case "low":
      return "Low priority"
    default:
      return undefined
  }
}

function statusAccent(status: string) {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-600/10"
    case "in_progress":
      return "text-primary bg-primary/10"
    default:
      return "text-amber-600 bg-amber-500/10"
  }
}

const TAB_OPTIONS: Array<{ id: DashboardTab; label: string; icon: LucideIcon }> = [
  { id: "matches", label: "Matches", icon: Sparkles },
  { id: "resume", label: "Resume Feedback", icon: FileText },
  { id: "interview", label: "Interview Practice", icon: CalendarCheck },
  { id: "learning", label: "Learning Hub", icon: BookOpen },
  { id: "activity", label: "Activity", icon: Clock },
]

export default function DashboardPage() {
  const [session, setSession] = useState<ReturnType<typeof getSession> | null>(null)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [focusQuery, setFocusQuery] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>("matches")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_RESUME_TYPES.has(file.type)) {
      setResumeError("Please upload a PDF, DOCX, or TXT file.")
      setResumeFile(null)
      event.target.value = ""
      return
    }

    if (file.size > MAX_RESUME_SIZE) {
      setResumeError("Resume must be smaller than 10MB.")
      setResumeFile(null)
      event.target.value = ""
      return
    }

    setResumeError(null)
    setResumeFile(file)
  }

  const clearResume = () => {
    setResumeFile(null)
    setResumeError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    const syncSession = () => setSession(getSession())
    syncSession()
    setIsSessionReady(true)
    window.addEventListener("storage", syncSession)
    return () => window.removeEventListener("storage", syncSession)
  }, [])

  const loadOverview = useCallback(async () => {
    if (!session?.userId) return

    setIsOverviewLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/dashboard/overview?userId=${session.userId}`, {
        headers: { "x-user-id": session.userId },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMessage("Please sign in again to refresh your dashboard.")
        } else {
          const data = await response.json().catch(() => null)
          setErrorMessage(data?.error || "We couldn’t load your dashboard right now.")
        }
        setOverview(null)
        return
      }

      const data = (await response.json()) as DashboardOverview
      setOverview(data)
    } catch (error) {
      console.error("dashboard_overview_fetch_error", error)
      setErrorMessage("Something went wrong while loading your dashboard. Please try again shortly.")
      setOverview(null)
    } finally {
      setIsOverviewLoading(false)
    }
  }, [session?.userId])

  useEffect(() => {
    if (session?.userId) {
      loadOverview()
    } else {
      setOverview(null)
      setIsOverviewLoading(false)
    }
  }, [session?.userId, loadOverview])

  if (!isSessionReady) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-text-secondary">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const handleGenerate = async () => {
    if (!session?.userId) return

    logDashboardEvent("dashboard_quick_action_select", { actionId: "suggestions" })
    setIsGenerating(true)
    setResumeError(null)
    setErrorMessage(null)

    const trimmedQuery = focusQuery.trim()
    try {
      const shouldUseFormData = Boolean(resumeFile) || trimmedQuery.length > 0
      let response: Response

      if (shouldUseFormData) {
        const formData = new FormData()
        formData.append("userId", session.userId)
        if (trimmedQuery.length) formData.append("query", trimmedQuery)
        if (resumeFile) formData.append("resume", resumeFile)

        response = await fetch("/api/careers/suggest", {
          method: "POST",
          headers: { "x-user-id": session.userId },
          body: formData,
        })
      } else {
        response = await fetch("/api/careers/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": session.userId,
          },
          body: JSON.stringify({ userId: session.userId }),
        })
      }

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMessage("Your session expired. Please sign in to generate new matches.")
        } else {
          const data = await response.json().catch(() => null)
          setErrorMessage(data?.error || "Unable to generate new suggestions right now.")
        }
        return
      }

      await loadOverview()
    } catch (error) {
      console.error("generate_matches_error", error)
      setErrorMessage("Something went wrong while generating matches. Please try again soon.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>Your personalised dashboard is ready once you log in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const matches = overview?.suggestions ?? []
  const topActivity = overview?.activity.slice(0, 5) ?? []

  const quickActions: QuickAction[] = [
    {
      id: "resume",
      title: "Update resume",
      description: "Upload your latest resume for AI-powered feedback.",
      icon: FileText,
      onClick: () => {
        logDashboardEvent("dashboard_quick_action_select", { actionId: "resume" })
        fileInputRef.current?.click()
      },
    },
    {
      id: "suggestions",
      title: "Get AI career suggestions",
      description: "Generate fresh matches tailored to your goals.",
      icon: Sparkles,
      onClick: handleGenerate,
      disabled: isGenerating,
    },
    {
      id: "skills",
      title: "Add a skill focus",
      description: "Tell the coach what you’re actively improving.",
      icon: ListChecks,
      href: "/profile?section=skills",
    },
    {
      id: "interview",
      title: "Practice an interview",
      description: "Run a mock interview to sharpen your storytelling.",
      icon: CalendarCheck,
      href: "/interview",
    },
    {
      id: "roadmap",
      title: "View roadmap",
      description: "Track upcoming milestones and celebrate wins.",
      icon: Compass,
      href: "#career-roadmap",
    },
  ]

  const nextRecommendedActions = useMemo(() => {
    if (!overview) return []

    const actions: QuickAction[] = []

    if (!overview.focusContext?.targetRole) {
      actions.push({
        id: "define-target-role",
        title: "Set your target role",
        description: "Capture the role you’re aiming for so the coach can align every recommendation.",
        icon: Target,
        href: "/profile?section=goals",
      })
    }

    if (overview.profileCompletion.percent < 80 || overview.profileCompletion.missingSections.length > 0) {
      actions.push({
        id: "profile-completion",
        title: "Complete your profile",
        description: "Add skills, interests, and goals to unlock sharper coaching.",
        icon: ListChecks,
        href: "/profile",
      })
    }

    if (!overview.resumeInsights) {
      actions.push({
        id: "resume-upload",
        title: "Upload your resume",
        description: "Get AI feedback and align it with your top target roles.",
        icon: FileText,
        href: "/resume",
      })
    }

    if (overview.suggestions.length === 0) {
      actions.push({
        id: "generate-matches",
        title: "Generate career matches",
        description: "Pull fresh AI suggestions tailored to your latest profile.",
        icon: Sparkles,
        href: "#career-matches",
      })
    }

    if (overview.interviews.length === 0) {
      actions.push({
        id: "schedule-interview",
        title: "Schedule a mock interview",
        description: "Practice your storytelling so you’re ready when recruiters call.",
        icon: CalendarCheck,
        href: "/interview",
      })
    }

    return actions.slice(0, 3)
  }, [overview])
  const analyticsHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (session?.userId) {
      headers["x-user-id"] = session.userId
    }
    return headers
  }, [session?.userId])
  const logDashboardEvent = useCallback(
    async (action: string, metadata?: Record<string, unknown>) => {
      try {
        await fetch("/api/analytics/events", {
          method: "POST",
          headers: analyticsHeaders,
          body: JSON.stringify({ action, metadata }),
        })
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("analytics_event_skip", error)
        }
      }
    },
    [analyticsHeaders]
  )

  if (isOverviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-text-secondary">Loading your personalised dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Greeting and Completion */}
      <Card className="border-border/60 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-semibold text-text-primary">
              Welcome back, {overview?.greetingName || "explorer"} 👋
            </CardTitle>
            <CardDescription className="text-base">
              Let’s keep momentum—your personalised career plan updates in real time.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/profile">
              Review profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
              <span>Profile completion</span>
              <span>{overview?.profileCompletion.percent ?? 0}%</span>
            </div>
            <Progress value={overview?.profileCompletion.percent ?? 0} className="h-2.5 bg-muted" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
            {overview?.profileCompletion.completedSections.map((section) => (
              <span key={section} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {section} complete
              </span>
            ))}
            {(overview?.profileCompletion.missingSections.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                {overview?.profileCompletion.missingSections.join(" • ")} pending
              </span>
            )}
          </div>
          {overview?.focusContext && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Current focus</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {overview.focusContext.targetRole || "Clarify your target role"}
                  </p>
                  {overview.focusContext.goalSummary && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {overview.focusContext.goalSummary}
                    </p>
                  )}
                  {overview.focusContext.marketSnapshot && (
                    <div className="mt-2 rounded-xl border border-primary/20 bg-background/90 p-3 text-xs text-text-secondary whitespace-pre-line">
                      {overview.focusContext.marketSnapshot}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="self-start text-[11px] text-text-secondary border-primary/40 bg-background">
                  Updated {formatRelativeTime(overview.focusContext.updatedAt)}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {nextRecommendedActions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Next recommended actions
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nextRecommendedActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.id}
                  href={action.href ?? "#"}
                  className={cn(
                    "group flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 transition duration-200 hover:border-primary/60 hover:shadow-lg",
                    !action.href && "pointer-events-none"
                  )}
                  onClick={() =>
                    action.href && logDashboardEvent("dashboard_recommended_action_click", { actionId: action.id })
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{action.title}</p>
                      <p className="mt-1 text-xs text-text-secondary leading-relaxed">{action.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Personalisation controls */}
      <Card>
        <CardHeader>
          <CardTitle>Fine-tune your recommendations</CardTitle>
          <CardDescription>
            Tell the coach what roles or industries you’re curious about and optionally attach your latest resume for deeper matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={focusQuery}
            onChange={(event) => setFocusQuery(event.target.value)}
            placeholder="Example: “I’m pivoting from customer support into product operations in fintech.”"
            rows={3}
            className="resize-none"
            disabled={isGenerating}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={RESUME_ACCEPT}
              className="hidden"
              onChange={handleResumeChange}
              disabled={isGenerating}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {resumeFile ? "Replace resume" : "Attach resume"}
            </Button>
            {resumeFile && (
              <div className="flex flex-1 items-center justify-between rounded-full border border-border bg-card px-3 py-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate" title={resumeFile.name}>
                    {resumeFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearResume}
                  className="ml-3 text-text-secondary hover:text-destructive"
                  title="Remove resume"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate new matches
                </>
              )}
            </Button>
          </div>
          {resumeError && <p className="text-sm text-destructive">{resumeError}</p>}
          <p className="text-xs text-text-secondary">
            We process resumes securely and only to enrich your current session’s recommendations.
          </p>
        </CardContent>
      </Card>

      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Career matches"
          value={overview?.stats.matches ?? 0}
          description="Tailored to your goals"
        />
        <StatCard
          icon={CalendarCheck}
          label="Interview sessions"
          value={overview?.stats.interviewSessions ?? 0}
          description="Completed or in progress"
        />
        <StatCard
          icon={ListChecks}
          label="Skills tracked"
          value={overview?.stats.skillsCount ?? 0}
          description="Included in your profile"
        />
        <StatCard
          icon={Target}
          label="Profile complete"
          value={`${overview?.stats.profileCompletion ?? 0}%`}
          description="Higher completion unlocks better guidance"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        {/* Main column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Career Explorer</CardTitle>
                <CardDescription>Navigate your matches, resume insights, interviews, and learning plan.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {TAB_OPTIONS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id)
                      logDashboardEvent("dashboard_tab_change", { tab: tab.id })
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition",
                      activeTab === tab.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {renderTabContent(activeTab, overview, matches)}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Next best actions</CardTitle>
              <CardDescription>Stay in motion with guided tasks designed for quick wins.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                const ButtonContent = (
                  <>
                    {action.title}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </>
                )
                return (
                  <div
                    key={action.id}
                    className="flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card/70 p-4"
                  >
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
                        <Icon className="h-3.5 w-3.5" />
                        Action
                      </div>
                      <h3 className="text-base font-semibold text-text-primary">{action.title}</h3>
                      <p className="text-sm text-text-secondary">{action.description}</p>
                    </div>
                    <div className="mt-4">
                      {action.href ? (
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link
                            href={action.href}
                            onClick={() =>
                              logDashboardEvent("dashboard_quick_action_select", { actionId: action.id })
                            }
                          >
                            {ButtonContent}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={action.onClick}
                          disabled={action.disabled}
                        >
                          {ButtonContent}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Secondary column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Pick up where you left off across chats, resumes, and practice sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topActivity.length === 0 && (
                <p className="text-sm text-text-secondary">No recent events yet. Generate matches or upload a resume to get started.</p>
              )}
              {topActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ActivityIcon type={activity.type} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-text-secondary line-clamp-2">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                  {activity.href && (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-text-secondary hover:text-text-primary">
                      <Link href={activity.href}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your coach recommends</CardTitle>
              <CardDescription>Fresh ideas curated from your recent activity and profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview?.coachTips.map((tip) => (
                <div key={tip.id} className="rounded-xl border border-border/60 bg-card/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">{tip.title}</h3>
                        {typeof tip.priority === "number" && (
                          <Badge variant="outline" className="text-xs">
                            Priority {tip.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{tip.description}</p>
                      {tip.actionUrl && (
                        <Button asChild size="sm" variant="ghost" className="h-auto px-0 text-primary">
                          <Link href={tip.actionUrl}>
                            {tip.actionText ?? "View recommendation"}
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile checklist</CardTitle>
              <CardDescription>Complete these details to receive sharper guidance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(overview?.profileCompletion.missingSections.length ?? 0) === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-500/40 bg-green-50 px-4 py-3 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  All profile sections complete. Great job!
                </div>
              ) : (
                overview?.profileCompletion.missingSections.map((section) => (
                  <div key={section} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-3 py-2">
                    <span>{section}</span>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/profile">
                        Update
                        <ArrowRight className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card id="career-roadmap">
            <CardHeader>
              <CardTitle>Career roadmap</CardTitle>
              <CardDescription>Track progress across your milestones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview?.roadmap.map((item, index) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">
                        Step {index + 1}
                      </Badge>
                      <div>
                        <h3 className="font-semibold text-text-primary">{item.title}</h3>
                        <p className="text-sm text-text-secondary">{item.description}</p>
                      </div>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", statusAccent(item.status))}>
                      {item.status === "completed"
                        ? "Completed"
                        : item.status === "in_progress"
                        ? "In progress"
                        : "Up next"}
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, item.progress))} className="h-2 bg-muted" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  description: string
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center justify-between gap-4 py-6">
        <div className="space-y-1.5">
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-2xl font-semibold text-text-primary">{value}</p>
          <p className="text-xs text-text-tertiary">{description}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function renderTabContent(tab: DashboardTab, overview: DashboardOverview | null, matches: CareerMatch[]) {
  if (!overview) {
    return <p className="text-sm text-text-secondary">We couldn’t load this view. Try refreshing the page.</p>
  }

  if (tab === "matches") {
    if (matches.length === 0) {
      return (
        <div id="career-matches" className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
          <Sparkles className="h-12 w-12 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">No matches yet</h3>
            <p className="text-sm text-text-secondary">
              Generate personalised matches to see AI-powered suggestions appear here.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div id="career-matches" className="grid gap-4 md:grid-cols-2">
        {matches.map((match) => {
          const matchScore = getMatchScore(match.confidenceScore)
          return (
            <Card key={match.id} className="h-full border-border/70 transition hover:border-primary/60 hover:shadow-lg">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{match.title}</h3>
                    <p className="text-sm text-text-secondary line-clamp-3">{match.summary}</p>
                  </div>
                  <Badge variant={matchScore >= 80 ? "success" : matchScore >= 60 ? "default" : "outline"}>
                    {matchScore}% fit
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  {match.skills.slice(0, 2).map((skill) => (
                    <span key={skill} className="rounded-full bg-muted px-3 py-1">
                      {skill}
                    </span>
                  ))}
                </div>
                {match.salaryGuideline && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span>{match.salaryGuideline}</span>
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <Link href={`/careers/${match.id}`}>
                      Learn more
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <span className="text-xs text-text-tertiary">{formatRelativeTime(match.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  if (tab === "resume") {
    if (!overview.resumeInsights) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
          <FileText className="h-12 w-12 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">No resume feedback yet</h3>
            <p className="text-sm text-text-secondary">
              Upload your resume above to receive AI-powered analysis, strengths, and next steps.
            </p>
          </div>
        </div>
      )
    }

    const insights = overview.resumeInsights
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Latest upload</p>
            <h3 className="text-xl font-semibold text-text-primary">{insights.fileName}</h3>
            <p className="text-xs text-text-tertiary">
              Uploaded {formatRelativeTime(insights.uploadedAt)}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Resume score</p>
              <p className="text-3xl font-semibold text-primary">
                {insights.overallScore ? Math.round(insights.overallScore) : "—"}
              </p>
            </div>
            {insights.alignment?.matchScore && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Alignment</p>
                <p className="text-3xl font-semibold text-text-primary">
                  {Math.round(insights.alignment.matchScore)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {insights.strengths && insights.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary uppercase">Strengths</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {insights.strengths.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.improvementSuggestions && insights.improvementSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary uppercase">Opportunities to improve</h4>
            <div className="space-y-2">
              {insights.improvementSuggestions.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-600">
                    {typeof item !== "string" && item.area && <AlertChip label={item.area} />}
                    {formatPriorityBadge(typeof item === "string" ? undefined : item.priority) && (
                      <Badge variant="outline" className="text-amber-600">
                        {formatPriorityBadge(typeof item === "string" ? undefined : item.priority)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-amber-700">
                    {typeof item === "string" ? item : item.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.skillsIdentified && insights.skillsIdentified.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary uppercase">Skills highlighted</h4>
            <div className="flex flex-wrap gap-2">
              {insights.skillsIdentified.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (tab === "interview") {
    return (
      <div className="space-y-4">
        <InterviewStatusSummary interviews={overview.interviews} />
        {overview.interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
            <CalendarCheck className="h-12 w-12 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">No interviews logged yet</h3>
              <p className="text-sm text-text-secondary">
                Run a mock interview to unlock tailored coaching notes and score breakdowns.
              </p>
            </div>
          </div>
        ) : (
          overview.interviews.map((interview) => {
            const status = deriveInterviewStatus(interview)
            return (
              <div
                key={interview.id}
                className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/50 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{interview.jobTitle}</p>
                    <Badge variant={status.badgeVariant}>{status.label}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <Badge variant="outline">{interview.difficulty}</Badge>
                    <span>Created {formatRelativeTime(interview.createdAt)}</span>
                    {interview.completedAt && <span>Completed {formatRelativeTime(interview.completedAt)}</span>}
                  </div>
                  <p className="text-xs text-text-tertiary">{status.helper}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-text-tertiary uppercase tracking-wide">Score</p>
                    <p className="text-lg font-semibold text-primary">
                      {typeof interview.overallScore === "number" ? Math.round(interview.overallScore) : "—"}
                    </p>
                  </div>
                  <Button asChild size="sm" variant={status.buttonVariant}>
                    <Link href={`/interview?sessionId=${interview.id}`}>
                      {status.buttonLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  if (tab === "learning") {
    if (overview.learningResources.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
          <BookOpen className="h-12 w-12 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">No resources yet</h3>
            <p className="text-sm text-text-secondary">
              Update your skills and goals to unlock curated courses, articles, and playbooks.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {overview.learningResources.map((resource) => (
          <Card key={resource.id} className="border-border/70 bg-card/80">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{resource.title}</h3>
                  {resource.category && <p className="text-xs text-text-tertiary uppercase">{resource.category}</p>}
                </div>
                <Bookmark className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-text-secondary line-clamp-3">{resource.description}</p>
              {resource.actionUrl && (
                <Button asChild size="sm" variant="ghost" className="h-auto px-0 text-primary">
                  <Link href={resource.actionUrl}>
                    {resource.actionText ?? "Open resource"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Activity tab
  return (
    <div className="space-y-3">
      {overview.activity.length === 0 && (
        <p className="text-sm text-text-secondary">No recent activity logged yet. Generate matches, upload a resume, or start an interview practice.</p>
      )}
      {overview.activity.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/70 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ActivityIcon type={activity.type} />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-text-primary">{activity.title}</p>
            {activity.description && <p className="text-xs text-text-secondary line-clamp-2">{activity.description}</p>}
            <span className="text-xs text-text-tertiary">{formatRelativeTime(activity.timestamp)}</span>
          </div>
          {activity.href && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-text-secondary hover:text-text-primary">
              <Link href={activity.href}>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "resume":
      return <FileText className="h-4 w-4" />
    case "interview":
      return <CalendarCheck className="h-4 w-4" />
    case "career":
      return <Sparkles className="h-4 w-4" />
    case "learning":
      return <BookOpen className="h-4 w-4" />
    default:
      return <BarChart3 className="h-4 w-4" />
  }
}

function AlertChip({ label }: { label: string }) {
  return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700">{label}</span>
}

function deriveInterviewStatus(interview: InterviewSummary) {
  if (typeof interview.overallScore === "number" && !Number.isNaN(interview.overallScore)) {
    return {
      label: "Scored",
      helper: "Review the score and identify stories to sharpen further.",
      badgeVariant: "success" as const,
      buttonLabel: "Review session",
      buttonVariant: "outline" as const,
    }
  }

  if (interview.completedAt) {
    return {
      label: "Needs scoring",
      helper: "Run the scoring flow to capture takeaways while the session is fresh.",
      badgeVariant: "default" as const,
      buttonLabel: "Score session",
      buttonVariant: "default" as const,
    }
  }

  return {
    label: "In progress",
    helper: "Finish the mock interview to unlock feedback and scoring.",
    badgeVariant: "outline" as const,
    buttonLabel: "Resume session",
    buttonVariant: "default" as const,
  }
}

function InterviewStatusSummary({ interviews }: { interviews: InterviewSummary[] }) {
  const totals = interviews.reduce(
    (acc, interview) => {
      const status = deriveInterviewStatus(interview)
      if (status.label === "Scored") acc.scored += 1
      else if (status.label === "Needs scoring") acc.awaiting += 1
      else acc.inProgress += 1
      return acc
    },
    { inProgress: 0, awaiting: 0, scored: 0 }
  )

  if (interviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Interview practice tracker</p>
            <p className="text-xs text-text-secondary">Kick off your first mock interview to start tracking momentum.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Interview practice tracker</p>
          <p className="text-xs text-text-secondary">Score sessions quickly to see your improvement trend.</p>
        </div>
        <Badge variant="outline" className="text-[11px] text-text-secondary">
          {interviews.length} session{interviews.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatusTile label="In progress" value={totals.inProgress} tone="amber" />
        <StatusTile label="Needs scoring" value={totals.awaiting} tone="sky" />
        <StatusTile label="Scored" value={totals.scored} tone="emerald" />
      </div>
    </div>
  )
}

function StatusTile({ label, value, tone }: { label: string; value: number; tone: "amber" | "sky" | "emerald" }) {
  const toneStyles: Record<"amber" | "sky" | "emerald", string> = {
    amber: "bg-amber-500/10 text-amber-700",
    sky: "bg-sky-500/10 text-sky-700",
    emerald: "bg-emerald-500/10 text-emerald-700",
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-bg px-4 py-3", toneStyles[tone])}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}


