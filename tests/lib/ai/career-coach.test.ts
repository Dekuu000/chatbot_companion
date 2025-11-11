import { describe, expect, it } from 'vitest'
import { determineUserStage, detectIntent } from '@/lib/ai/chat-response'
import {
  parseResumeSnapshot,
  deriveCoachingContext,
  buildPersonalizedCoachPlan,
  enforceContextualRelevance,
} from '@/lib/ai/career-coach'

const baseProfile = {
  id: 'profile-1',
  userId: 'user-1',
  skills: JSON.stringify(['HTML', 'CSS']),
  interests: JSON.stringify(['Web Development']),
  educationLevel: 'Bachelor of Science in IT',
  major: 'Information Technology',
  currentYear: 'Graduate',
  goals: 'Pivot into frontend development',
  createdAt: new Date(),
  updatedAt: new Date(),
} as any

describe('career intent helpers', () => {
  it('detects role-specific career requests', () => {
    expect(detectIntent('I want a roadmap to become a web developer in the Philippines').category).toBe('career')
  })

  it('detects pivot questions correctly', () => {
    const intent = detectIntent('I am a designer shifting into product management—what path should I follow?')
    expect(intent.category).toBe('industry_pivot')
  })

  it('determines user stage using profile context', () => {
    const stage = determineUserStage('Help me prepare for full-time roles.', baseProfile)
    expect(stage).toBe('career_planner')
  })
})

describe('coaching context derivation', () => {
  const resumeRecord = {
    fileName: 'resume.pdf',
    analysisResult: JSON.stringify({
      overallScore: 72,
      strengths: ['Built a React admin dashboard that cut manual reporting by 40%.'],
      improvementSuggestions: [
        { area: 'Portfolio', suggestion: 'Link live demos for each project to prove responsiveness.', priority: 'high' },
        { area: 'Metrics', suggestion: 'Quantify impact in every bullet.', priority: 'medium' },
      ],
      skillsIdentified: ['React', 'JavaScript', 'Tailwind CSS'],
      careerAlignment: { careers: [{ title: 'Web Developer', matchScore: 78 }] },
    }),
  }

  const resumeSnapshot = parseResumeSnapshot(resumeRecord)

  it('extracts target role and resume context', () => {
    const context = deriveCoachingContext({
      message: 'I just uploaded my resume. Build me a web developer career plan focused on frontend roles in PH.',
      intent: 'career',
      stage: 'career_planner',
      profile: baseProfile,
      resume: resumeSnapshot,
      history: [],
    })

    expect(context.targetDisplay).toBe('Web Developer')
    expect(context.resumeSummary).toMatch(/Overall score/i)
    expect(context.resumeSkills).toContain('React')
  })

  it('detects pivot current role from message history', () => {
    const history = [
      { role: 'user' as const, content: 'Earlier you told me about UX design opportunities.' },
      { role: 'assistant' as const, content: 'Sure, let us explore.' },
    ]
    const pivotContext = deriveCoachingContext({
      message: 'I am a graphic designer transitioning to UX/UI designer. What should my roadmap look like?',
      intent: 'industry_pivot',
      stage: 'career_planner',
      profile: baseProfile,
      resume: null,
      history,
    })

    expect(pivotContext.targetDisplay).toBe('UX/UI Designer')
    expect(pivotContext.pivotDetected).toBe(true)
  })
})

describe('personalised coach plan generation', () => {
  const resumeSnapshot = parseResumeSnapshot({
    fileName: 'resume.pdf',
    analysisResult: JSON.stringify({
      overallScore: 75,
      strengths: ['Documented agile ceremonies and collaboration with engineers.'],
      improvementSuggestions: [
        { area: 'Projects', suggestion: 'Add live links to two deployed web projects.', priority: 'high' },
      ],
      skillsIdentified: ['HTML', 'CSS', 'React'],
      careerAlignment: { careers: [{ title: 'Web Developer', matchScore: 82 }] },
    }),
  })

  it('builds a role-specific roadmap referencing resume insights', () => {
    const context = deriveCoachingContext({
      message: 'Help me polish my resume and career plan for a web developer role.',
      intent: 'resume',
      stage: 'career_planner',
      profile: baseProfile,
      resume: resumeSnapshot,
      history: [],
    })

    const plan = buildPersonalizedCoachPlan(context)
    expect(plan).toMatch(/Fit Score:/i)
    expect(plan).toMatch(/Web Developer/i)
    expect(plan).toMatch(/Skills to lock in/i)
    expect(plan).toMatch(/Where do we push next/i)
    expect(context.personaName).toBe('Senior Tech Career Coach')
    expect(context.personaContext).toMatch(/software/i)
    expect(context.memorySummary).toMatch(/Bachelor of Science in IT/i)
  })

  it('asks for clarification when target role is missing', () => {
    const context = deriveCoachingContext({
      message: 'Can you help me decide what tech role fits me?',
      intent: 'career',
      stage: 'college_student',
      profile: null,
      resume: null,
      history: [],
    })

    const plan = buildPersonalizedCoachPlan(context)
    expect(plan).toMatch(/right now your target role isn’t spelled out/i)
    expect(plan).toMatch(/Tell me which role you’re seriously considering/i)
    expect(context.personaName.length).toBeGreaterThan(0)
  })

  it('switches persona when healthcare terms are present', () => {
    const context = deriveCoachingContext({
      message: 'I am a nurse who wants to move into hospital administration. Any advice?',
      intent: 'industry_pivot',
      stage: 'career_planner',
      profile: {
        ...baseProfile,
        educationLevel: 'Bachelor of Science in Nursing',
        major: 'Nursing',
        skills: JSON.stringify(['Patient Care', 'Clinical Operations']),
      } as any,
      resume: null,
      history: [],
    })

    expect(context.personaName).toBe('Professional Healthcare Recruiter')
    expect(context.personaContext).toMatch(/healthcare/i)
    expect(context.memorySummary).toMatch(/Nursing/i)
  })
})

describe('contextual relevance enforcement', () => {
  const resumeSnapshot = parseResumeSnapshot({
    fileName: 'resume.pdf',
    analysisResult: JSON.stringify({
      strengths: ['Managed end-to-end frontend builds.'],
      improvementSuggestions: [{ suggestion: 'Quantify the results of each UI improvement.' }],
      skillsIdentified: ['React'],
      careerAlignment: { careers: [{ title: 'Web Developer', matchScore: 76 }] },
    }),
  })

  const context = deriveCoachingContext({
    message: 'Give me a web developer plan.',
    intent: 'career',
    stage: 'career_planner',
    profile: baseProfile,
    resume: resumeSnapshot,
    history: [],
  })

  it('flags generic or mismatched output', () => {
    const irrelevant = enforceContextualRelevance('Here is a data analyst pathway with SQL advice.', context)
    expect(irrelevant).toBeNull()
  })

  it('accepts aligned coaching output', () => {
    const aligned = enforceContextualRelevance('## Focus\n- Build momentum toward Web Developer roles in PH.\n**Next Step**\nWould you like mock interview questions?', context)
    expect(aligned).not.toBeNull()
  })
})

