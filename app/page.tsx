"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, MessageSquare, FileText, GraduationCap, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSession, type UserSession } from "@/lib/session"

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null)

  useEffect(() => {
    setSession(getSession())
  }, [])

  const careerMatchesHref = session ? "/dashboard" : "/login?redirect=/dashboard"

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-5xl font-bold text-text-primary mb-4">
          Discover Your Career Path
        </h1>
        <p className="text-xl text-text-secondary mb-8">
          Get personalized career recommendations powered by AI, tailored to your skills, interests, and goals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href={careerMatchesHref}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-base font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8"
            )}
          >
            Career Matches
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/chat"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-base font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-primary text-primary hover:bg-primary/10 h-12 px-8"
            )}
          >
            Try Chat
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <Sparkles className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Career Matches</CardTitle>
            <CardDescription>
              Get personalized career recommendations based on your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              Discover careers that match your unique profile and goals
            </p>
            <Link
              href={careerMatchesHref}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-text-primary w-full h-11 px-6 py-2"
              )}
            >
              Explore Matches <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <MessageSquare className="h-10 w-10 text-primary mb-2" />
            <CardTitle>AI Chat</CardTitle>
            <CardDescription>
              Ask questions about careers, skills, and opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/chat"
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-text-primary w-full h-11 px-6 py-2"
              )}
            >
              Start Chat <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <FileText className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Resume Review</CardTitle>
            <CardDescription>
              Upload your resume for AI-powered feedback and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={session ? "/resume" : "/login?redirect=/resume"}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-text-primary w-full h-11 px-6 py-2"
              )}
            >
              Upload Resume <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <GraduationCap className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Learning Path</CardTitle>
            <CardDescription>
              Get a personalized roadmap to achieve your career goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={session ? "/learning" : "/login?redirect=/learning"}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-text-primary w-full h-11 px-6 py-2"
              )}
            >
              View Path <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
