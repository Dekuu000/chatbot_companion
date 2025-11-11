/**
 * Profile Page - Redesigned with Onboarding Stepper UI
 * Multi-step form for collecting user profile information
 */

'use client'

import { useState, useEffect } from 'react'
import { UserCircle, GraduationCap, Briefcase, Heart, CheckCircle2, ArrowRight, ArrowLeft, X } from 'lucide-react'
import { getSession, type UserSession } from '@/lib/session'
import Link from 'next/link'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Stepper } from '@/components/ui/stepper'

type Step = 'education' | 'skills' | 'interests' | 'goals' | 'review'

interface ProfileData {
  educationLevel: string
  major: string
  currentYear: string
  skills: string[]
  interests: string[]
  goals: string
}

export default function ProfilePage() {
  const [currentStep, setCurrentStep] = useState<Step>('education')
  const [profile, setProfile] = useState<ProfileData>({
    educationLevel: '',
    major: '',
    currentYear: '',
    skills: [],
    interests: [],
    goals: '',
  })
  const [newSkill, setNewSkill] = useState('')
  const [newInterest, setNewInterest] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [session, setSession] = useState<UserSession | null>(null)
  const [sessionInitialized, setSessionInitialized] = useState(false)

  const steps = ['Education', 'Skills', 'Interests', 'Goals', 'Review']

  const getStepIndex = (step: Step): number => {
    const stepMap: Record<Step, number> = {
      education: 0,
      skills: 1,
      interests: 2,
      goals: 3,
      review: 4,
    }
    return stepMap[step]
  }

  useEffect(() => {
    const storedSession = getSession()
    setSession(storedSession)
    setSessionInitialized(true)
  }, [])

  useEffect(() => {
    if (!sessionInitialized) return

    if (!session?.userId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    const loadProfile = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/profile?userId=${session.userId}`)
        if (!response.ok) {
          throw new Error('Failed to load profile')
        }
        const data = await response.json()
        if (!cancelled && data.profile) {
          setProfile({
            educationLevel: data.profile.educationLevel || '',
            major: data.profile.major || '',
            currentYear: data.profile.currentYear || '',
            skills: data.profile.skills || [],
            interests: data.profile.interests || [],
            goals: data.profile.goals || '',
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load profile:', error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [sessionInitialized, session?.userId])

  const handleSave = async () => {
    if (!session) return

    setIsSaving(true)
    setSaveStatus('saving')
    setMessage('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          ...profile,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setSaveStatus('saved')
      setMessage('Profile saved successfully!')
      setTimeout(() => {
        setSaveStatus('idle')
        setMessage('')
      }, 3000)
    } catch (error) {
      setSaveStatus('error')
      setMessage('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skill) })
  }

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest.trim()],
      })
      setNewInterest('')
    }
  }

  const removeInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests.filter((i) => i !== interest),
    })
  }

  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 'education':
        return !!profile.educationLevel
      case 'skills':
        return profile.skills.length > 0
      case 'interests':
        return profile.interests.length > 0
      case 'goals':
        return profile.goals.trim().length > 0
      default:
        return true
    }
  }

  const nextStep = () => {
    const stepOrder: Step[] = ['education', 'skills', 'interests', 'goals', 'review']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const stepOrder: Step[] = ['education', 'skills', 'interests', 'goals', 'review']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  if (!isLoading && (!session || !session.userId)) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to edit your profile</CardDescription>
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
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-text-primary flex items-center justify-center">
            <UserCircle className="h-10 w-10 text-primary mr-3" />
            My Profile
          </h1>
          <p className="text-text-secondary">
            Complete your profile to get personalized career recommendations
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={steps} currentStep={getStepIndex(currentStep)} />
        </div>

        {/* Save Status */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl ${
                saveStatus === 'saved'
                  ? 'bg-accent-50 border border-accent-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {saveStatus === 'saved' ? (
                    <CheckCircle2 className="h-5 w-5 text-accent mr-2" />
                  ) : (
                    <X className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <p
                    className={
                      saveStatus === 'saved' ? 'text-accent-800' : 'text-red-800'
                    }
                  >
                    {message}
                  </p>
                </div>
                <button
                  onClick={() => setMessage('')}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Dismiss message"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

        {/* Step Content */}
        <div key={currentStep}>
            <Card>
              {currentStep === 'education' && (
                <>
                  <CardHeader>
                    <CardTitle>Education Information</CardTitle>
                    <CardDescription>Tell us about your educational background</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="educationLevel">Education Level</Label>
                        <select
                          id="educationLevel"
                          value={profile.educationLevel}
                          onChange={(e) =>
                            setProfile({ ...profile, educationLevel: e.target.value })
                          }
                          required
                          className="flex h-11 w-full rounded-xl border border-input bg-bg-surface px-4 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select...</option>
                          <option>High School</option>
                          <option>Bachelor's</option>
                          <option>Master's</option>
                          <option>PhD</option>
                        </select>
                        <p className="text-sm text-text-secondary">
                          Select your highest level of education
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="major">Major/Field of Study</Label>
                        <Input
                          id="major"
                          value={profile.major}
                          onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                          placeholder="e.g., Computer Science, Business, Engineering"
                        />
                        <p className="text-sm text-text-secondary">
                          What did you study or are currently studying?
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currentYear">Current Year</Label>
                        <select
                          id="currentYear"
                          value={profile.currentYear}
                          onChange={(e) =>
                            setProfile({ ...profile, currentYear: e.target.value })
                          }
                          className="flex h-11 w-full rounded-xl border border-input bg-bg-surface px-4 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select...</option>
                          <option>Freshman</option>
                          <option>Sophomore</option>
                          <option>Junior</option>
                          <option>Senior</option>
                          <option>Graduate</option>
                        </select>
                        <p className="text-sm text-text-secondary">
                          Select your current academic year
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 'skills' && (
                <>
                  <CardHeader>
                    <CardTitle>Your Skills</CardTitle>
                    <CardDescription>Add skills that you have or are learning</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Skills Tags */}
                      {profile.skills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-3">
                            Your Skills ({profile.skills.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill, idx) => (
                              <Badge key={idx} variant="default" className="gap-2">
                                {skill}
                                <button
                                  onClick={() => removeSkill(skill)}
                                  className="ml-1 hover:opacity-70"
                                  aria-label={`Remove ${skill}`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Skill Input */}
                      <div className="space-y-2">
                        <Input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addSkill()
                            }
                          }}
                          placeholder="e.g., Python, Communication, Project Management"
                        />
                        <Button type="button" onClick={addSkill} variant="outline" size="sm">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Add Skill
                        </Button>
                      </div>

                      {profile.skills.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Briefcase className="h-12 w-12 mx-auto mb-3 text-text-secondary" />
                          <p>Add your first skill to get started</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 'interests' && (
                <>
                  <CardHeader>
                    <CardTitle>Your Interests</CardTitle>
                    <CardDescription>What career fields or topics interest you?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Interests Tags */}
                      {profile.interests.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-3">
                            Your Interests ({profile.interests.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {profile.interests.map((interest, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-2">
                                {interest}
                                <button
                                  onClick={() => removeInterest(interest)}
                                  className="ml-1 hover:opacity-70"
                                  aria-label={`Remove ${interest}`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Interest Input */}
                      <div className="space-y-2">
                        <Input
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addInterest()
                            }
                          }}
                          placeholder="e.g., Software Development, Data Science, Design"
                        />
                        <Button type="button" onClick={addInterest} variant="outline" size="sm">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Add Interest
                        </Button>
                      </div>

                      {profile.interests.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Heart className="h-12 w-12 mx-auto mb-3 text-text-secondary" />
                          <p>Add your interests to help us recommend careers</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 'goals' && (
                <>
                  <CardHeader>
                    <CardTitle>Career Goals</CardTitle>
                    <CardDescription>Tell us about your career aspirations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What are your career goals?
                      </label>
                      <textarea
                        value={profile.goals}
                        onChange={(e) => setProfile({ ...profile, goals: e.target.value })}
                        rows={6}
                        placeholder="Describe your career goals, dream job, or what you want to achieve..."
                        className="w-full px-4 py-3 rounded-xl border border-neutral-border dark:border-gray-600 bg-neutral-surface dark:bg-gray-700 text-dark-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Be specific about what you want to achieve in your career
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 'review' && (
                <>
                  <CardHeader>
                    <CardTitle>Review Your Profile</CardTitle>
                    <CardDescription>Review your information before saving</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Education */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h3 className="font-semibold text-dark-text mb-3 flex items-center">
                          <GraduationCap className="h-5 w-5 text-primary mr-2" />
                          Education
                        </h3>
                        <div className="space-y-1 text-gray-700">
                          <p>
                            <span className="font-medium">Level:</span>{' '}
                            {profile.educationLevel || 'Not specified'}
                          </p>
                          {profile.major && (
                            <p>
                              <span className="font-medium">Major:</span> {profile.major}
                            </p>
                          )}
                          {profile.currentYear && (
                            <p>
                              <span className="font-medium">Year:</span> {profile.currentYear}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h3 className="font-semibold text-dark-text mb-3 flex items-center">
                          <Briefcase className="h-5 w-5 text-primary mr-2" />
                          Skills ({profile.skills.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.length > 0 ? (
                            profile.skills.map((skill, idx) => (
                              <Badge key={idx} variant="primary" size="sm">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No skills added</p>
                          )}
                        </div>
                      </div>

                      {/* Interests */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h3 className="font-semibold text-dark-text mb-3 flex items-center">
                          <Heart className="h-5 w-5 text-accent mr-2" />
                          Interests ({profile.interests.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.interests.length > 0 ? (
                            profile.interests.map((interest, idx) => (
                              <Badge key={idx} variant="accent" size="sm">
                                {interest}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No interests added</p>
                          )}
                        </div>
                      </div>

                      {/* Goals */}
                      {profile.goals && (
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <h3 className="font-semibold text-dark-text mb-3">Career Goals</h3>
                          <p className="text-gray-700 whitespace-pre-wrap">{profile.goals}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 'education'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

          <div className="flex items-center gap-4">
            {saveStatus === 'saving' && (
              <div className="flex items-center text-gray-600">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm">Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center text-accent">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span className="text-sm">Saved!</span>
              </div>
            )}

            {currentStep === 'review' ? (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="lg"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed(currentStep)}
                size="lg"
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Save Button (always visible) */}
        {currentStep !== 'review' && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Progress'}
            </Button>
          </div>
        )}
    </div>
  )
}
