"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Stepper } from "@/components/ui/stepper"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle2, XCircle, Sparkles, ArrowRight, Menu, X } from "lucide-react"
import { getSession, type UserSession } from "@/lib/session"
import { useSidebarContext } from "@/components/layout/sidebar-layout"
import { cn } from "@/lib/utils"
import Link from "next/link"

const STEPS = ["Upload", "Analyzing", "Results"]

interface AnalysisResult {
  overallScore: number
  careerAlignment?: {
    careers: Array<{ title: string; matchScore: number }>
    matchScore: number
  }
  improvementSuggestions?: Array<{
    area: string
    suggestion: string
    priority: "high" | "medium" | "low"
  }>
  strengths?: string[]
  weaknesses?: string[]
  skillsIdentified?: string[]
}

export default function ResumePage() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

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
    setSessionInitialized(true)
  }, [])

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return
    }
    setUploadedFile(file)
    setError("")
  }

  const handleUpload = async () => {
    if (!uploadedFile || !session?.userId) return

    setIsUploading(true)
    setError("")
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { "x-user-id": session.userId },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await response.json()
      setResumeId(data.id)
      setCurrentStep(1)
      setTimeout(() => handleAnalyze(data.id), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleAnalyze = async (resumeIdentifier?: string) => {
    const targetResumeId = resumeIdentifier ?? resumeId
    if (!targetResumeId || !session?.userId) return

    setIsAnalyzing(true)
    setError("")
    setAnalysisProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 300)

      const response = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-user-id": session.userId,
        },
        body: JSON.stringify({
          resumeId: targetResumeId,
          userId: session.userId,
        }),
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Analysis failed")
      }

      const data = await response.json()
      setAnalysisResult(data.analysis)
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
      setTimeout(() => setAnalysisProgress(0), 1000)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  if (!sessionInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !session.userId) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to upload and analyze your resume</CardDescription>
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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
      {/* Header */}
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">Resume Analysis</h1>
          <p className="text-sm sm:text-base text-text-secondary">Get AI-powered feedback on your resume</p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} />

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Resume</CardTitle>
            <CardDescription>Upload a PDF file to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Upload className={`h-16 w-16 mx-auto mb-4 ${isDragging ? "text-primary" : "text-text-secondary"}`} />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {isDragging ? "Drop your file here" : "Drag & drop your resume"}
              </h3>
              <p className="text-text-secondary mb-6">or select a PDF file from your computer</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload">
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">
                    Select PDF File
                  </span>
                </Button>
              </label>
            </div>

            {uploadedFile && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-text-primary">{uploadedFile.name}</p>
                    <p className="text-sm text-text-secondary">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  Remove
                </Button>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Uploading...</span>
                  <span className="text-text-primary font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {uploadedFile && !isUploading && (
              <Button onClick={handleUpload} className="w-full" size="lg">
                Upload & Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis in Progress</CardTitle>
            <CardDescription>Our AI is analyzing your resume and generating feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Analyzing resume...</span>
                  <span className="text-text-primary font-medium">{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} />
              </div>
              <p className="text-text-secondary mt-6">This may take a few moments...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && analysisResult && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Resume Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-primary">
                  {analysisResult.overallScore}
                  <span className="text-3xl text-text-secondary">/100</span>
                </div>
                <Progress value={analysisResult.overallScore} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysisResult.strengths && analysisResult.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <CardTitle>Strengths</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysisResult.weaknesses && analysisResult.weaknesses.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <CardTitle>Areas for Improvement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Career Alignment */}
          {analysisResult.careerAlignment && (
            <Card>
              <CardHeader>
                <CardTitle>Career Alignment</CardTitle>
                <CardDescription>Careers that match your resume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.careerAlignment.careers?.map((career, idx) => (
                    <Badge key={idx} variant="default">
                      {career.title} ({career.matchScore}% match)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Improvement Suggestions */}
          {analysisResult.improvementSuggestions && analysisResult.improvementSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.improvementSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-4 border-l-4 rounded-xl"
                    style={{
                      borderLeftColor:
                        suggestion.priority === "high"
                          ? "#EF4444"
                          : suggestion.priority === "medium"
                          ? "#F59E0B"
                          : "#3B82F6",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-text-primary">{suggestion.area}</span>
                      <Badge
                        variant={
                          suggestion.priority === "high"
                            ? "destructive"
                            : suggestion.priority === "medium"
                            ? "warning"
                            : "default"
                        }
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-text-secondary text-sm">{suggestion.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Skills Identified */}
          {analysisResult.skillsIdentified && analysisResult.skillsIdentified.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills Identified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.skillsIdentified.map((skill, idx) => (
                    <Badge key={idx} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button size="lg" onClick={() => {
              setCurrentStep(0)
              setUploadedFile(null)
              setAnalysisResult(null)
              setResumeId(null)
            }} className="w-full sm:w-auto">
              Analyze Another Resume
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/dashboard">View Career Matches</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}



