"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Stepper } from "@/components/ui/stepper"
import { X, Plus, ArrowRight, ArrowLeft } from "lucide-react"
import { getSession } from "@/lib/session"

const STEPS = ["Education", "Skills", "Interests", "Goals", "Review"]

const STATUS_OPTIONS = [
  { value: 'college_student', label: 'College student or intern' },
  { value: 'graduating_student', label: 'Graduating soon' },
  { value: 'early_professional', label: 'Early-career professional (0-3 years)' },
  { value: 'experienced_professional', label: 'Experienced professional (3+ years)' },
  { value: 'career_switcher', label: 'Career switcher exploring new paths' },
  { value: 'returning_workforce', label: 'Returning to the workforce' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const session = getSession()
  const [currentStep, setCurrentStep] = useState(0)
  
  const [formData, setFormData] = useState({
    educationLevel: "",
    major: "",
    currentYear: "",
    skills: [] as string[],
    interests: [] as string[],
    goals: "",
  })

  const [newSkill, setNewSkill] = useState("")
  const [newInterest, setNewInterest] = useState("")

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      })
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    })
  }

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, newInterest.trim()],
      })
      setNewInterest("")
    }
  }

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((i) => i !== interest),
    })
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!formData.educationLevel
      case 1:
        return formData.skills.length > 0
      case 2:
        return formData.interests.length > 0
      case 3:
        return formData.goals.trim().length > 0
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!session) {
      router.push("/login")
      return
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          educationLevel: formData.educationLevel,
          major: formData.major,
          currentYear: formData.currentYear,
          skills: JSON.stringify(formData.skills),
          interests: JSON.stringify(formData.interests),
          goals: formData.goals,
        }),
      })

      if (response.ok) {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Failed to save profile:", error)
    }
  }

  const isStudentStatus = ['college_student', 'graduating_student'].includes(formData.educationLevel)

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to complete your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">Complete Your Profile</h1>
        <p className="text-sm sm:text-base text-text-secondary">Whether you're studying or already working, tell us about your background so we can tailor advice.</p>
      </div>

      {/* Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} />

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep]}</CardTitle>
          <CardDescription>
            {currentStep === 0 && "Share the basics about where you are in your career journey"}
            {currentStep === 1 && "Add skills you have or are learning"}
            {currentStep === 2 && "What career fields interest you?"}
            {currentStep === 3 && "Share your career aspirations"}
            {currentStep === 4 && "Review your information before saving"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 0: Education */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="educationLevel">Current Status *</Label>
                <select
                  id="educationLevel"
                  value={formData.educationLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, educationLevel: e.target.value })
                  }
                  className="flex h-11 w-full rounded-xl border border-input bg-bg-surface px-4 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select...</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Focus / Field</Label>
                <Input
                  id="major"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  placeholder={isStudentStatus ? "e.g., BS Computer Science, Hospitality Management" : "e.g., Frontend Development, Customer Success, Healthcare"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentYear">
                  {isStudentStatus ? 'Current Year' : 'Experience Snapshot'}
                </Label>
                {isStudentStatus ? (
                  <select
                    id="currentYear"
                    value={formData.currentYear}
                    onChange={(e) =>
                      setFormData({ ...formData, currentYear: e.target.value })
                    }
                    className="flex h-11 w-full rounded-xl border border-input bg-bg-surface px-4 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option>Freshman</option>
                    <option>Sophomore</option>
                    <option>Junior</option>
                    <option>Senior</option>
                    <option>Graduate</option>
                  </select>
                ) : (
                  <Textarea
                    id="currentYear"
                    value={formData.currentYear}
                    onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                    placeholder="e.g., 3 years as a customer support specialist, currently exploring product roles"
                    rows={3}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 1: Skills */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-2">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill (e.g., Python, Communication)"
                  className="flex-1"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Interests */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest) => (
                    <Badge key={interest} variant="default" className="gap-2">
                      {interest}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                  placeholder="Add an interest (e.g., Software Development, Design)"
                  className="flex-1"
                />
                <Button type="button" onClick={addInterest} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {currentStep === 3 && (
            <div className="space-y-2">
              <Label htmlFor="goals">Career Goals *</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="Describe your career goals, dream job, or what you want to achieve..."
                rows={6}
              />
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-text-primary">Education</h3>
                <p className="text-sm text-text-secondary">
                  {formData.educationLevel || "Not specified"}
                  {formData.major && ` • ${formData.major}`}
                  {formData.currentYear && ` • ${formData.currentYear}`}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-text-primary">Skills ({formData.skills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-text-primary">Interests ({formData.interests.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest) => (
                    <Badge key={interest} variant="default">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
              {formData.goals && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-text-primary">Career Goals</h3>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{formData.goals}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 px-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="w-full sm:w-auto order-1 sm:order-2">
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="w-full sm:w-auto order-1 sm:order-2">
            Complete Profile
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}






