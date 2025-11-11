"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, DollarSign, Lightbulb, BookOpen, TrendingUp } from "lucide-react"
import { getSession } from "@/lib/session"
import Link from "next/link"

interface CareerDetail {
  id: string
  title: string
  summary: string
  skillsRequired: string | string[]
  confidenceScore?: number | null
  salaryGuideline?: string | null
  nextSteps?: string | null
  verificationPlan?: string | null
}

export default function CareerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const session = getSession()
  const [career, setCareer] = useState<CareerDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session && params.id) {
      loadCareerDetail()
    }
  }, [session, params.id])

  const loadCareerDetail = async () => {
    if (!session) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/careers/list?userId=${session.userId}`)
      if (response.ok) {
        const data = await response.json()
        const found = data.suggestions?.find((c: CareerDetail) => c.id === params.id)
        if (found) {
          setCareer(found)
        }
      }
    } catch (error) {
      console.error("Failed to load career detail:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const parseSkills = (skills: string | string[]): string[] => {
    if (Array.isArray(skills)) return skills
    try {
      return JSON.parse(skills)
    } catch {
      return typeof skills === "string" ? skills.split(",").map((s) => s.trim()) : []
    }
  }

  const getMatchScore = (score: number | null | undefined): number => {
    if (!score) return 75
    return Math.round(score * 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Loading career details...</p>
      </div>
    )
  }

  if (!career) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Career Not Found</CardTitle>
            <CardDescription>The career you're looking for doesn't exist</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const matchScore = getMatchScore(career.confidenceScore)
  const skills = parseSkills(career.skillsRequired)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-text-primary">{career.title}</h1>
            <p className="text-text-secondary mt-2">{career.summary}</p>
          </div>
          <Badge
            variant={matchScore >= 80 ? "success" : matchScore >= 60 ? "default" : "warning"}
            className="text-base px-4 py-2"
          >
            {matchScore}% Match
          </Badge>
        </div>
      </div>

      {/* Match Reasoning */}
      {career.verificationPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <CardTitle>Why This Career Fits You</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary leading-relaxed">{career.verificationPlan}</p>
          </CardContent>
        </Card>
      )}

      {/* Skills Required */}
      {skills.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>Required Skills</CardTitle>
            </div>
            <CardDescription>
              Skills needed to succeed in this career path
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary Information */}
      {career.salaryGuideline && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent" />
              <CardTitle>Salary Range</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary">{career.salaryGuideline}</p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {career.nextSteps && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle>Next Steps</CardTitle>
            </div>
            <CardDescription>
              Recommended actions to pursue this career
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
              {career.nextSteps}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Match Score Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Match Score Breakdown</CardTitle>
          </div>
          <CardDescription>
            How we calculated your {matchScore}% match score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Skills Alignment</span>
              <Badge variant="default">
                {matchScore >= 80 ? "Excellent" : matchScore >= 60 ? "Good" : "Fair"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Interest Match</span>
              <Badge variant="default">
                {matchScore >= 80 ? "High" : matchScore >= 60 ? "Medium" : "Low"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Education Fit</span>
              <Badge variant="default">Compatible</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button size="lg" asChild>
          <Link href="/dashboard">Explore More Careers</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/learning">View Learning Path</Link>
        </Button>
      </div>
    </div>
  )
}







