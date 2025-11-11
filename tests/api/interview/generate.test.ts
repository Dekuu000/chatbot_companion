// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getUserSession: vi.fn(async () => ({ userId: 'user_1', email: 'demo@example.com' })),
}))

vi.mock('@/lib/services/interview.service', () => ({
  interviewService: {
    createSession: vi.fn(async () => ({
      id: 'session_123',
      questions: [
        { question: 'Tell me about yourself', difficulty: 'easy', guidelines: 'Be concise' },
      ],
    })),
  },
}))

import { POST } from '@/app/api/interview/generate/route'

describe('POST /api/interview/generate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns interview questions', async () => {
    const req: any = {
      json: async () => ({ userId: 'user_1', jobTitle: 'Software Engineer', difficulty: 'easy' }),
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
    expect(body.sessionId).toBe('session_123')
    expect(body.questions[0].question).toBe('Tell me about yourself')
  })
})




vi.mock('@/lib/auth', () => ({
  getUserSession: vi.fn(async () => ({ userId: 'user_1', email: 'demo@example.com' })),
}))

vi.mock('@/lib/services/interview.service', () => ({
  interviewService: {
    createSession: vi.fn(async () => ({
      id: 'session_123',
      questions: [
        { question: 'Tell me about yourself', difficulty: 'easy', guidelines: 'Be concise' },
      ],
    })),
  },
}))

import { POST } from '@/app/api/interview/generate/route'

describe('POST /api/interview/generate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns interview questions', async () => {
    const req: any = {
      json: async () => ({ userId: 'user_1', jobTitle: 'Software Engineer', difficulty: 'easy' }),
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
    expect(body.sessionId).toBe('session_123')
    expect(body.questions[0].question).toBe('Tell me about yourself')
  })
})




