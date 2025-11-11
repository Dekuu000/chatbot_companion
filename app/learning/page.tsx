"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  GraduationCap, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Calendar,
  Target,
  Sparkles
} from "lucide-react"
import { getSession } from "@/lib/session"
import Link from "next/link"

interface LearningStep {
  id: string
  title: string
  description: string
  duration: string
  resources?: Array<{ title: string; url: string }>
  completed: boolean
}

interface LearningPath {
  id: string
  title: string
  description: string
  careerGoal: string
  steps: LearningStep[]
  progress: number
  completed: boolean
}

export default function LearningPage() {
  const [session, setSession] = useState<ReturnType<typeof getSession> | null>(null)
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const currentSession = getSession()
    setSession(currentSession)
  }, [])

  useEffect(() => {
    if (session?.userId && !hasLoaded) {
      loadLearningPaths()
    } else if (!session) {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId])

  const loadLearningPaths = async () => {
    if (!session?.userId || hasLoaded) return

    setIsLoading(true)
    setHasLoaded(true)
    try {
      const response = await fetch(`/api/learning/paths?userId=${session.userId}`, {
        headers: {
          'x-user-id': session.userId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setPaths(data.paths || [])
        if (data.paths && data.paths.length > 0) {
          setSelectedPath(data.paths[0])
        }
      } else if (response.status === 429) {
        console.warn('Rate limit exceeded, please wait before retrying')
      }
    } catch (error) {
      console.error("Failed to load learning paths:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePath = async () => {
    if (!session) return

    try {
      const response = await fetch("/api/learning/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.userId,
        },
        body: JSON.stringify({
          userId: session.userId,
          careerGoal: "Software Engineer", // This should come from user selection
        }),
      })

      if (response.ok) {
        setHasLoaded(false) // Reset to allow reload
        await loadLearningPaths()
      }
    } catch (error) {
      console.error("Failed to generate learning path:", error)
    }
  }

  const handleToggleStep = async (stepId: string) => {
    if (!selectedPath || !session) return

    const updatedSteps = selectedPath.steps.map((step) =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    )

    const completedCount = updatedSteps.filter((s) => s.completed).length
    const newProgress = (completedCount / updatedSteps.length) * 100

    const updatedPath = {
      ...selectedPath,
      steps: updatedSteps,
      progress: newProgress,
      completed: newProgress === 100,
    }

    setSelectedPath(updatedPath)

    // Update in backend
    try {
      await fetch("/api/learning/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.userId,
        },
        body: JSON.stringify({
          userId: session.userId,
          pathId: selectedPath.id,
          stepId,
          completed: updatedSteps.find((s) => s.id === stepId)?.completed,
        }),
      })
    } catch (error) {
      console.error("Failed to update progress:", error)
    }
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your learning paths</CardDescription>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Loading learning paths...</p>
      </div>
    )
  }

  if (paths.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-text-primary">Learning Paths</h1>
          <p className="text-text-secondary">Get a personalized roadmap to achieve your career goals</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="mb-2">No learning paths yet</CardTitle>
            <CardDescription className="mb-6">
              Generate a personalized learning path based on your career goals
            </CardDescription>
            <Button onClick={handleGeneratePath} size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Learning Path
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">Learning Paths</h1>
          <p className="text-sm sm:text-base text-text-secondary mt-2">
            Your personalized roadmap to career success
          </p>
        </div>
        <Button onClick={handleGeneratePath} className="w-full sm:w-auto flex-shrink-0">
          <Sparkles className="mr-2 h-4 w-4" />
          New Path
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
        {/* Paths List */}
        <div className="lg:col-span-1 space-y-4">
          {paths.map((path) => (
            <Card
              key={path.id}
              className={`cursor-pointer transition-all ${
                selectedPath?.id === path.id
                  ? "border-primary shadow-medium"
                  : "hover:shadow-soft"
              }`}
              onClick={() => setSelectedPath(path)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{path.title}</CardTitle>
                  {path.completed && (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">{path.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Progress</span>
                    <span className="text-text-primary font-medium">
                      {Math.round(path.progress)}%
                    </span>
                  </div>
                  <Progress value={path.progress} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Path Timeline */}
        {selectedPath && (
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedPath.title}</CardTitle>
                    <CardDescription className="mt-2">{selectedPath.description}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      selectedPath.completed
                        ? "success"
                        : selectedPath.progress >= 50
                        ? "default"
                        : "warning"
                    }
                    className="text-base px-4 py-2"
                  >
                    {Math.round(selectedPath.progress)}% Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Overall Progress</span>
                    <span className="text-text-primary font-medium">
                      {selectedPath.steps.filter((s) => s.completed).length} /{" "}
                      {selectedPath.steps.length} steps
                    </span>
                  </div>
                  <Progress value={selectedPath.progress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Learning Steps</CardTitle>
                </div>
                <CardDescription>Follow these steps to achieve your career goal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {selectedPath.steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {/* Timeline Line */}
                      {index < selectedPath.steps.length - 1 && (
                        <div
                          className={`absolute left-5 top-12 w-0.5 h-full ${
                            step.completed ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}

                      <div className="flex gap-4">
                        {/* Timeline Dot */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleToggleStep(step.id)}
                            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                              step.completed
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-bg-surface border-border text-text-secondary hover:border-primary"
                            }`}
                          >
                            {step.completed ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-text-primary text-lg">
                                {step.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4 text-text-secondary" />
                                <span className="text-sm text-text-secondary">
                                  {step.duration}
                                </span>
                              </div>
                            </div>
                            {step.completed && (
                              <Badge variant="success" className="text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <p className="text-text-secondary mb-4">{step.description}</p>

                          {/* Resources */}
                          {step.resources && step.resources.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-text-primary">Resources:</p>
                              <div className="flex flex-wrap gap-2">
                                {step.resources.map((resource, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {resource.title}
                                      <ArrowRight className="ml-2 h-3 w-3" />
                                    </a>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}









