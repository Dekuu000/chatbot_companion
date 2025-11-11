import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/career-coach'
import { buildCareerGuideUserPrompt } from '@/lib/openai'

describe('buildSystemPrompt', () => {
  it('injects advisor persona and PH context', () => {
    const prompt = buildSystemPrompt({
      mode: 'authenticated',
      stage: 'career_planner',
      personaName: 'PH Tech Coach',
      personaContext: 'Guides engineers through PH startup and SEA remote opportunities.',
      intent: 'career',
      localization: 'ph',
      profileSummary: 'BSCS graduate focused on fintech.',
      resumeSummary: 'Shipped lending app, led QA fixes.',
      memorySummary: 'Wants remote-friendly fintech teams.',
      skillGaps: ['target role'],
      priorTags: undefined,
      targetRole: 'Software Engineer',
      marketContext: '**PH Salary Band:** ₱45k – ₱90k / month',
      learningTracks: [{ title: 'DICT Emerging Tech Scholarship', url: 'https://dict.gov.ph' }],
      interestLabel: 'coding and building software',
      recommendedCareers: ['Front-End Web Developer', 'Software Engineer', 'QA Engineer'],
    })

    expect(prompt).toMatch(/^You are an elite career advisor/)
    expect(prompt).toContain('SYSTEM CONTEXT — Authenticated Session')
    expect(prompt).toContain('Primary target role: Software Engineer')
    expect(prompt).toContain('Philippines labour snapshot')
    expect(prompt).toContain('DICT Emerging Tech Scholarship')
    expect(prompt).toContain('Interest to mirror: coding and building software')
    expect(prompt).toContain('Recommended careers to emphasise')
  })
})

describe('buildCareerGuideUserPrompt', () => {
  it('adds market snapshot and proof-of-work suggestions', () => {
    const prompt = buildCareerGuideUserPrompt({
      userMessage: 'How do I break into backend engineering?',
      personaContext: 'Stage: career_planner\nGuidance focus: Provide upskilling pathways.',
      detectedIntent: 'career',
      userStage: 'career_planner',
      targetRole: 'Software Engineer',
      currentRole: 'Customer Support',
      resumeSummary: 'Handled automation scripts; improved ticket resolution.',
      conversationSummary: 'Asked about pivot to backend; has Python fundamentals.',
      missingDetails: ['specific companies'],
      personaName: 'Senior Tech Career Coach',
      memorySummary: 'Prefers remote-friendly PH startups.',
      intentFocus: 'Coach them toward a PH startup backend role with measurable next steps.',
      marketSnapshot: '**PH Salary Band:** ₱45k – ₱90k / month',
      recommendedProjects: ['Deploy a REST API with monitoring.', 'Write a retrospective on bug triaging.'],
      interestLabel: 'coding and building software',
      recommendedCareers: ['Front-End Web Developer', 'Software Engineer', 'QA Engineer'],
    })

    expect(prompt).toContain('Philippines market insight')
    expect(prompt).toContain('Proof-of-work suggestions')
    expect(prompt).toMatch(/Deploy a REST API/)
    expect(prompt).toContain('Stated interest focus')
    expect(prompt).toContain('PH career paths to emphasise first')
  })
})

