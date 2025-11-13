"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp, Play, RotateCcw, ArrowRight, Menu, X } from "lucide-react"
import { getSession } from "@/lib/session"
import { useSidebarContext } from "@/components/layout/sidebar-layout"
import { cn } from "@/lib/utils"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { stripInternalThought } from "@/lib/ai/chat-response"

interface Question {
  question: string
  difficulty: string
  guidelines?: string
}

interface QuestionScoreDetail {
  score: number
  feedback: string
  strengths: string[]
  weaknesses: string[]
}

interface InterviewSession {
  sessionId?: string
  jobTitle: string
  difficulty: string
  questions: Question[]
  responses: Record<number, string>
  scores?: Record<number, number>
  overallScore?: number
  feedback?: string
  scoreDetails?: QuestionScoreDetail[]
}

export default function InterviewPage() {
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [jobTitle, setJobTitle] = useState("")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [sessionData, setSessionData] = useState<InterviewSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get sidebar context for mobile toggle
  let sidebarContext = null
  try {
    sidebarContext = useSidebarContext()
  } catch {
    // Sidebar context not available (e.g., on non-sidebar pages)
    sidebarContext = null
  }
  const { isMobileSidebarOpen, toggleMobileSidebar } = sidebarContext || { isMobileSidebarOpen: false, toggleMobileSidebar: () => {} }

  useEffect(() => {
    setSession(getSession())
    setIsSessionReady(true)
  }, [])

  if (!isSessionReady) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="h-24 rounded-2xl border border-border/60 bg-card/80 animate-pulse" />
        <div className="space-y-4">
          <div className="h-12 rounded-xl border border-border/50 bg-card/70 animate-pulse" />
          <div className="h-40 rounded-2xl border border-border/40 bg-card/60 animate-pulse" />
        </div>
      </div>
    )
  }

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !session?.userId) return

    setError(null)
    setIsGenerating(true)
    try {
      const response = await fetch("/api/interview/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.userId,
        },
        body: JSON.stringify({
          userId: session.userId,
          jobTitle: jobTitle.trim(),
          difficulty,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSessionData({
          jobTitle: jobTitle.trim(),
          difficulty,
          questions: data.questions || [],
          responses: {},
          sessionId: data.sessionId,
        })
        setCurrentQuestion(0)
        setResponses({})
        setShowResults(false)
      } else {
        const data = await response.json().catch(() => null)
        const message = data?.error || data?.message || "Failed to generate questions. Please try again."
        setError(message)
      }
    } catch (error) {
      console.error("Failed to generate questions:", error)
      setError("Something went wrong while generating your interview. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmitResponse = () => {
    if (sessionData && currentQuestion < sessionData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      handleScoreInterview()
    }
  }

  const handleScoreInterview = async () => {
    if (!sessionData || !session?.userId || !sessionData.sessionId) return

    setError(null)
    setIsScoring(true)
    try {
      const responsePayload = sessionData.questions.map((question, idx) => ({
        questionId: question.question || `question-${idx + 1}`,
        answer: responses[idx] || "",
      }))

      const response = await fetch("/api/interview/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.userId,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          responses: responsePayload,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.result || data
        const scoreMap: Record<number, number> = {}
        if (Array.isArray(result.scores)) {
          result.scores.forEach((item: any, idx: number) => {
            if (typeof item.score === "number") {
              scoreMap[idx] = item.score
            }
          })
        }
        setSessionData({
          ...sessionData,
          scores: scoreMap,
          overallScore: result.overallScore,
          feedback: result.feedback,
          scoreDetails: Array.isArray(result.scores)
            ? result.scores.map((item: any) => ({
                score: item.score ?? 0,
                feedback: item.feedback || "",
                strengths: item.strengths || [],
                weaknesses: item.weaknesses || [],
              }))
            : undefined,
        })
        setShowResults(true)
      } else {
        const data = await response.json().catch(() => null)
        const message = data?.error || data?.message || "Failed to score interview."
        setError(message)
      }
    } catch (error) {
      console.error("Failed to score interview:", error)
      setError("We hit a snag while scoring. Please try again.")
    } finally {
      setIsScoring(false)
    }
  }

  const handleReset = () => {
    setSessionData(null)
    setCurrentQuestion(0)
    setResponses({})
    setShowResults(false)
    setJobTitle("")
    setError(null)
  }

  const renderCoachingSummary = (text: string | undefined) => {
    if (!text) return null
    const cleaned = stripInternalThought(text).trim()
    if (!cleaned) return null

    const normalised = cleaned
      .replace(/\r\n/g, '\n')
      // convert numbered headings like "### 1. Title" into ordered list items
      .replace(/^\s*###\s+(\d+\.\s*)(.+)$/gm, '\n$1$2')
      .replace(/^\s*##\s+(\d+\.\s*)(.+)$/gm, '\n$1$2')
      // ensure major headings become their own blocks
      .replace(/\s*##\s+/g, '\n\n## ')
      .replace(/\s*###\s+/g, '\n\n### ')
      .replace(/\s*####\s+/g, '\n\n#### ')
      // ensure unordered list markers start new lines
      .replace(/\s+-\s+/g, '\n- ')
      // ensure ordered list markers start new lines
      .replace(/(^|\n)\s*(\d+\.\s+)/g, '\n$2')
      // convert lines that are fully bold into headings
      .replace(/^\*\*(.+?)\*\*$/gm, '## $1')
      // remove leftover double asterisks used for emphasis
      .replace(/\*\*/g, '')
      // collapse excessive spacing
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return (
      <div className="space-y-4 text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4 className="text-base font-semibold text-text-primary mt-4">
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5 className="text-sm font-semibold uppercase tracking-wide text-primary mt-4">
                {children}
              </h5>
            ),
            p: ({ children }) => (
              <p className="text-sm text-text-secondary">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-medium text-text-primary">
                {children}
              </strong>
            ),
            ul: ({ children }) => (
              <ul className="list-disc space-y-2 pl-5 text-text-secondary">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal space-y-2 pl-6 text-text-secondary">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">
                {children}
              </li>
            ),
          }}
        >
          {normalised}
        </ReactMarkdown>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to practice interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
        <div className="space-y-2">
          {/* Mobile Menu Toggle */}
          {sidebarContext && (
            <div className="flex items-center gap-2 sm:gap-3 mb-4 md:hidden">
              <Button
                data-mobile-menu-button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex-shrink-0",
                  "h-9 w-9 rounded-xl",
                  "bg-bg-surface/95 backdrop-blur-sm border border-border/60",
                  "shadow-sm hover:shadow-md",
                  "hover:bg-muted/80 hover:border-border",
                  "active:scale-95",
                  "transition-all duration-200",
                  "text-text-primary"
                )}
                onClick={toggleMobileSidebar}
                aria-label="Toggle sidebar"
              >
                {isMobileSidebarOpen ? (
                  <X className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <Menu className="h-4 w-4 transition-transform duration-200" />
                )}
              </Button>
            </div>
          )}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">Mock Interview</h1>
            <p className="text-sm sm:text-base text-text-secondary">Practice with AI-generated interview questions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start Interview Session</CardTitle>
            <CardDescription>Enter the job title and select difficulty level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Software Engineer, Data Scientist"
                onKeyPress={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <Button
                    key={level}
                    variant={difficulty === level ? "default" : "outline"}
                    onClick={() => setDifficulty(level)}
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!jobTitle.trim() || isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Interview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((currentQuestion + 1) / sessionData.questions.length) * 100
  const currentQ = sessionData.questions[currentQuestion]

  if (showResults && sessionData.overallScore !== undefined) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          {/* Mobile Menu Toggle */}
          {sidebarContext && (
            <div className="flex items-center gap-2 sm:gap-3 mb-4 md:hidden">
              <Button
                data-mobile-menu-button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex-shrink-0",
                  "h-9 w-9 rounded-xl",
                  "bg-bg-surface/95 backdrop-blur-sm border border-border/60",
                  "shadow-sm hover:shadow-md",
                  "hover:bg-muted/80 hover:border-border",
                  "active:scale-95",
                  "transition-all duration-200",
                  "text-text-primary"
                )}
                onClick={toggleMobileSidebar}
                aria-label="Toggle sidebar"
              >
                {isMobileSidebarOpen ? (
                  <X className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <Menu className="h-4 w-4 transition-transform duration-200" />
                )}
              </Button>
            </div>
          )}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">Interview Results</h1>
            <p className="text-sm sm:text-base text-text-secondary">Your performance analysis</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-primary">
                {Math.round(sessionData.overallScore)}
                <span className="text-3xl text-text-secondary">/100</span>
              </div>
              <Progress value={sessionData.overallScore} className="h-3" />
              <Badge
                variant={
                  sessionData.overallScore >= 80
                    ? "success"
                    : sessionData.overallScore >= 60
                    ? "default"
                    : "warning"
                }
                className="text-base px-4 py-2"
              >
                {sessionData.overallScore >= 80
                  ? "Excellent"
                  : sessionData.overallScore >= 60
                  ? "Good"
                  : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {sessionData.questions.map((question, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-text-primary">Question {idx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {question.difficulty}
                      </Badge>
                    </div>
                    <p className="text-text-secondary mb-3">{question.question}</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-xl">
                        <p className="text-sm text-text-secondary">
                          <span className="font-medium">Your Answer:</span> {responses[idx] || "No answer provided"}
                        </p>
                      </div>
                      {sessionData.scoreDetails?.[idx]?.feedback && (
                        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                          <p className="text-sm text-text-primary">
                            <span className="font-semibold">Coaching Note:</span> {sessionData.scoreDetails[idx].feedback}
                          </p>
                          <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {sessionData.scoreDetails[idx].strengths?.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Strengths</p>
                                <ul className="space-y-1 text-sm text-text-secondary">
                                  {sessionData.scoreDetails[idx].strengths.map((strength, sIdx) => (
                                    <li key={sIdx}>• {strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {sessionData.scoreDetails[idx].weaknesses?.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Improve</p>
                                <ul className="space-y-1 text-sm text-text-secondary">
                                  {sessionData.scoreDetails[idx].weaknesses.map((weakness, wIdx) => (
                                    <li key={wIdx}>• {weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {sessionData.scores && (
                    <Badge
                      variant={
                        sessionData.scores[idx] >= 80
                          ? "success"
                          : sessionData.scores[idx] >= 60
                          ? "default"
                          : "warning"
                      }
                      className="ml-4"
                    >
                      {Math.round(sessionData.scores[idx])}%
                    </Badge>
                  )}
                </div>
                {idx < sessionData.questions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button size="lg" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Start New Interview
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard">View Career Matches</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
      <div className="space-y-4">
        {/* Mobile Menu Toggle */}
        {sidebarContext && (
          <div className="flex items-center gap-2 sm:gap-3 md:hidden">
            <Button
              data-mobile-menu-button
              variant="ghost"
              size="icon"
              className={cn(
                "flex-shrink-0",
                "h-9 w-9 rounded-xl",
                "bg-bg-surface/95 backdrop-blur-sm border border-border/60",
                "shadow-sm hover:shadow-md",
                "hover:bg-muted/80 hover:border-border",
                "active:scale-95",
                "transition-all duration-200",
                "text-text-primary"
              )}
              onClick={toggleMobileSidebar}
              aria-label="Toggle sidebar"
            >
              {isMobileSidebarOpen ? (
                <X className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <Menu className="h-4 w-4 transition-transform duration-200" />
              )}
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{sessionData.jobTitle}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{sessionData.difficulty}</Badge>
              <span className="text-sm text-text-secondary">
                Question {currentQuestion + 1} of {sessionData.questions.length}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Progress</span>
          <span className="text-text-primary font-medium">
            {currentQuestion + 1}/{sessionData.questions.length}
          </span>
        </div>
        <Progress value={progress} />
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>Question {currentQuestion + 1}</CardTitle>
          </div>
          <CardDescription>Difficulty: {currentQ.difficulty}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-lg text-text-primary mb-4">{currentQ.question}</p>
            {currentQ.guidelines && (
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                  <span className="text-sm font-medium text-text-primary">Answer Guidelines</span>
                </div>
                <div className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                  {currentQ.guidelines}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="response">Your Answer</Label>
            <Textarea
              id="response"
              value={responses[currentQuestion] || ""}
              onChange={(e) => setResponses({ ...responses, [currentQuestion]: e.target.value })}
              placeholder="Type your answer here..."
              rows={6}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
              Previous
            </Button>
            <Button onClick={handleSubmitResponse} disabled={!responses[currentQuestion]?.trim()}>
              {currentQuestion < sessionData.questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  {isScoring ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                      Scoring...
                    </>
                  ) : (
                    "Submit & Score"
                  )}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Time Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Take 1-2 minutes to outline your answer before speaking. Structure helps keep your story sharp.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle>STAR Reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Situation, Task, Action, Result: hit each step to show impact and your decision-making.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle>Clarity Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Mention tools, datasets, and outcomes. Interviewers need to picture how you work end-to-end.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
