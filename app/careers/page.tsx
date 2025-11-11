"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Sparkles, X, Bookmark, CheckCircle2, DollarSign, Lightbulb, GraduationCap } from "lucide-react"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSession } from "@/lib/session"
import Link from "next/link"

interface CareerSuggestion {
  id: string
  title: string
  skillsRequired: string | string[]
  summary: string
  salaryGuideline?: string | null
  nextSteps?: string | null
  confidenceScore?: number | null
  verificationPlan?: string | null
  createdAt: string
}

export default function CareersPage() {
  const [suggestions, setSuggestions] = useState<CareerSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [savedCareers, setSavedCareers] = useState<Set<string>>(new Set())
  const session = getSession()

  useEffect(() => {
    if (session) {
      loadSuggestions()
    } else {
      setIsLoading(false)
    }
  }, [session])

  const loadSuggestions = async () => {
    if (!session) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/careers/list?userId=${session.userId}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error("Failed to load suggestions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateNew = async () => {
    if (!session) return

    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/careers/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          query: "Generate fresh career suggestions based on my profile",
        }),
      })

      if (!response.ok) throw new Error("Failed to generate suggestions")

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setExpandedId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestions")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveCareer = (careerId: string) => {
    setSavedCareers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(careerId)) {
        newSet.delete(careerId)
      } else {
        newSet.add(careerId)
      }
      return newSet
    })
  }

  const parseSkills = (skills: string | string[]): string[] => {
    if (Array.isArray(skills)) return skills
    try {
      return JSON.parse(skills)
    } catch {
      return typeof skills === "string" ? skills.split(",").map((s) => s.trim()) : []
    }
  }

  const getMatchScore = (confidence: number | null | undefined): number => {
    if (!confidence) return 75
    return Math.round(confidence * 100)
  }

  const getScoreVariant = (score: number): "success" | "default" | "warning" => {
    if (score >= 80) return "success"
    if (score >= 60) return "default"
    return "warning"
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view career suggestions</CardDescription>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-2 flex items-center flex-wrap gap-2">
            <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            <span>Your Career Matches</span>
          </h1>
          <p className="text-sm sm:text-base text-text-secondary">
            Discover career paths tailored to your skills, interests, and goals
          </p>
        </div>
        <Button onClick={handleGenerateNew} disabled={isGenerating} variant="secondary" className="w-full sm:w-auto flex-shrink-0">
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate New"}
        </Button>
      </div>

      {/* Stats Bar */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total Matches</p>
                  <p className="text-2xl font-bold text-text-primary">{suggestions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Saved</p>
                  <p className="text-2xl font-bold text-primary">{savedCareers.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Avg. Match</p>
                  <p className="text-2xl font-bold text-accent">
                    {Math.round(
                      suggestions.reduce((acc, s) => acc + getMatchScore(s.confidenceScore), 0) /
                        suggestions.length
                    )}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading your career suggestions...</p>
          </div>
        </div>
      ) : suggestions.length === 0 ? (
        /* Empty State */
        <div className="text-center py-24">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12">
              <div className="mb-6">
                <Sparkles className="h-20 w-20 text-primary mx-auto" />
              </div>
              <CardTitle className="mb-2">No career suggestions yet</CardTitle>
              <CardDescription className="mb-6">
                Generate personalized career recommendations based on your profile
              </CardDescription>
              <Button onClick={handleGenerateNew} disabled={isGenerating} size="lg">
                {isGenerating ? "Generating..." : "Get Career Suggestions"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Career Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
          {suggestions
            .sort((a, b) => {
              const scoreA = getMatchScore(a.confidenceScore)
              const scoreB = getMatchScore(b.confidenceScore)
              return scoreB - scoreA
            })
            .map((career) => {
              const matchScore = getMatchScore(career.confidenceScore)
              const skills = parseSkills(career.skillsRequired)
              const isExpanded = expandedId === career.id
              const isSaved = savedCareers.has(career.id)

              return (
                <Card key={career.id} className="hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{career.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getScoreVariant(matchScore)}>
                            {matchScore}% Match
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveCareer(career.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isSaved
                            ? "text-accent bg-accent/10"
                            : "text-text-secondary hover:text-text-primary hover:bg-muted"
                        }`}
                        aria-label={isSaved ? "Unsave career" : "Save career"}
                      >
                        <Bookmark className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-3">{career.summary}</CardDescription>

                    {/* Skills Preview */}
                    {skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                          Key Skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {skills.slice(0, 3).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-border space-y-4">
                        {/* Why This Fits */}
                        {career.verificationPlan && (
                          <div className="p-4 bg-primary/5 rounded-xl">
                            <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center">
                              <CheckCircle2 className="h-4 w-4 text-accent mr-2" />
                              Why This Career Fits You
                            </h4>
                            <p className="text-sm text-text-secondary">{career.verificationPlan}</p>
                          </div>
                        )}

                        {/* Salary */}
                        {career.salaryGuideline && (
                          <div className="p-4 bg-accent/5 rounded-xl">
                            <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center">
                              <DollarSign className="h-4 w-4 text-accent mr-2" />
                              Salary Range
                            </h4>
                            <p className="text-sm text-text-secondary">{career.salaryGuideline}</p>
                          </div>
                        )}

                        {/* Next Steps */}
                        {career.nextSteps && (
                          <div className="p-4 bg-yellow-50 rounded-xl">
                            <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center">
                              <Lightbulb className="h-4 w-4 text-yellow-600 mr-2" />
                              Next Steps
                            </h4>
                            <p className="text-sm text-text-secondary">{career.nextSteps}</p>
                          </div>
                        )}

                        {/* All Skills */}
                        {skills.length > 3 && (
                          <div>
                            <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center">
                              <GraduationCap className="h-4 w-4 text-primary mr-2" />
                              All Required Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-border flex gap-2">
                      <Button variant="default" size="sm" className="flex-1" asChild>
                        <Link href={`/careers/${career.id}`}>
                          Explore
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : career.id)}
                      >
                        {isExpanded ? "Less" : "More"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
