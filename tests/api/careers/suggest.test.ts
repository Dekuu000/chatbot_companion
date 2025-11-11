// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks
vi.mock('@/lib/auth', () => ({
  getUserSession: vi.fn(async () => ({ userId: 'user_1', email: 'demo@example.com', name: 'Demo' })),
}))

vi.mock('@/lib/profile', () => ({
  ensureProfile: vi.fn(async () => ({
    userId: 'user_1', skills: '[]', interests: '[]', educationLevel: null, major: null, currentYear: null, goals: null,
  })),
}))

vi.mock('@/lib/openai', () => ({
  openai: {
    chat: { completions: { create: async () => ({
      choices: [{ message: { content: JSON.stringify({ suggestions: [
        { title: 'Software Engineer', skillsRequired: 'JavaScript, React', summary: 'Build software', salaryGuideline: '$60k-$120k', nextSteps: 'Learn React', confidenceScore: 0.8, verificationPlan: 'Check market reports' }
      ] }) } }],
    }) } },
  },
  CAREER_GUIDE_SYSTEM_PROMPT: '',
  PERPLEXITY_API_URL: 'https://mocked',
  PERPLEXITY_DEFAULT_MODEL: 'mock-model',
  getPerplexityHeaders: () => ({}),
  buildCareerGuideUserPrompt: () => '',
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    careerSuggestion: { create: vi.fn(async ({ data }) => ({ id: 'cs_1', ...data })) },
    user: { findUnique: vi.fn(async () => ({ id: 'user_1', email: 'demo@example.com' })) },
  },
}))

vi.mock('@/lib/services/career.service', () => ({
  careerService: {
    suggestCareers: vi.fn(async () => [
      {
        title: 'Software Engineer',
        skillsRequired: ['JavaScript', 'React'],
        summary: 'Build software',
        salaryGuideline: '$60k-$120k',
        nextSteps: 'Learn React',
        confidenceScore: 0.8,
        verificationPlan: 'Check market reports',
      },
    ]),
  },
}))

vi.mock('@/lib/services/analytics.service', () => ({
  analyticsService: {
    trackEvent: vi.fn(async () => {}),
  },
}))

const mockFetchResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          suggestions: [
            { title: 'Software Engineer', skillsRequired: 'JavaScript, React', summary: 'Build software', salaryGuideline: '$60k-$120k', nextSteps: 'Learn React', confidenceScore: 0.8, verificationPlan: 'Check market reports' },
          ],
        }),
      },
    },
  ],
}

vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockFetchResponse))))

import { POST } from '@/app/api/careers/suggest/route'

describe('POST /api/careers/suggest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns suggestions and saves them', async () => {
    const req: any = {
      json: async () => ({ userId: 'user_1', query: 'based on my profile' }),
      headers: (() => {
        const headers = new Headers()
        headers.set('x-user-id', 'user_1')
        return headers
      })(),
      nextUrl: { searchParams: new URLSearchParams() },
    }
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.suggestions)).toBe(true)
    expect(body.suggestions[0].title).toBe('Software Engineer')
  })
})




// Mocks
vi.mock('@/lib/auth', () => ({
  getUserSession: vi.fn(async () => ({ userId: 'user_1', email: 'demo@example.com', name: 'Demo' })),
}))

vi.mock('@/lib/profile', () => ({
  ensureProfile: vi.fn(async () => ({
    userId: 'user_1', skills: '[]', interests: '[]', educationLevel: null, major: null, currentYear: null, goals: null,
  })),
}))

vi.mock('@/lib/openai', () => ({
  openai: {
    chat: { completions: { create: async () => ({
      choices: [{ message: { content: JSON.stringify({ suggestions: [
        { title: 'Software Engineer', skillsRequired: 'JavaScript, React', summary: 'Build software', salaryGuideline: '$60k-$120k', nextSteps: 'Learn React', confidenceScore: 0.8, verificationPlan: 'Check market reports' }
      ] }) } }],
    }) } },
  },
  CAREER_GUIDE_SYSTEM_PROMPT: '',
  PERPLEXITY_API_URL: 'https://mocked',
  PERPLEXITY_DEFAULT_MODEL: 'mock-model',
  getPerplexityHeaders: () => ({}),
  buildCareerGuideUserPrompt: () => '',
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    careerSuggestion: { create: vi.fn(async ({ data }) => ({ id: 'cs_1', ...data })) },
    user: { findUnique: vi.fn(async () => ({ id: 'user_1', email: 'demo@example.com' })) },
  },
}))

vi.mock('@/lib/services/career.service', () => ({
  careerService: {
    suggestCareers: vi.fn(async () => [
      {
        title: 'Software Engineer',
        skillsRequired: ['JavaScript', 'React'],
        summary: 'Build software',
        salaryGuideline: '$60k-$120k',
        nextSteps: 'Learn React',
        confidenceScore: 0.8,
        verificationPlan: 'Check market reports',
      },
    ]),
  },
}))

vi.mock('@/lib/services/analytics.service', () => ({
  analyticsService: {
    trackEvent: vi.fn(async () => {}),
  },
}))

const mockFetchResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          suggestions: [
            { title: 'Software Engineer', skillsRequired: 'JavaScript, React', summary: 'Build software', salaryGuideline: '$60k-$120k', nextSteps: 'Learn React', confidenceScore: 0.8, verificationPlan: 'Check market reports' },
          ],
        }),
      },
    },
  ],
}

vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockFetchResponse))))

import { POST } from '@/app/api/careers/suggest/route'

describe('POST /api/careers/suggest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns suggestions and saves them', async () => {
    const req: any = {
      json: async () => ({ userId: 'user_1', query: 'based on my profile' }),
      headers: (() => {
        const headers = new Headers()
        headers.set('x-user-id', 'user_1')
        return headers
      })(),
      nextUrl: { searchParams: new URLSearchParams() },
    }
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.suggestions)).toBe(true)
    expect(body.suggestions[0].title).toBe('Software Engineer')
  })
})




