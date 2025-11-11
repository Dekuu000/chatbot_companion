// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getUserSession: vi.fn(async () => null),
}))

vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: async () => ({ choices: [] }) } } },
  CAREER_GUIDE_SYSTEM_PROMPT: '',
  PERPLEXITY_API_URL: 'https://mocked',
  PERPLEXITY_DEFAULT_MODEL: 'mock-model',
  getPerplexityHeaders: () => ({}),
  buildCareerGuideUserPrompt: () => '',
}))

import { POST } from '@/app/api/ai/chat/route'

describe('POST /api/ai/chat (unauthorized)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when user session is invalid', async () => {
    const req: any = {
      json: async () => ({ message: 'Hello', userId: 'bad', conversationId: undefined }),
      headers: new Headers(),
      nextUrl: { searchParams: new URLSearchParams() },
    }
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})




vi.mock('@/lib/auth', () => ({
  getUserSession: vi.fn(async () => null),
}))

vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: async () => ({ choices: [] }) } } },
  CAREER_GUIDE_SYSTEM_PROMPT: '',
  PERPLEXITY_API_URL: 'https://mocked',
  PERPLEXITY_DEFAULT_MODEL: 'mock-model',
  getPerplexityHeaders: () => ({}),
  buildCareerGuideUserPrompt: () => '',
}))

import { POST } from '@/app/api/ai/chat/route'

describe('POST /api/ai/chat (unauthorized)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when user session is invalid', async () => {
    const req: any = {
      json: async () => ({ message: 'Hello', userId: 'bad', conversationId: undefined }),
      headers: new Headers(),
      nextUrl: { searchParams: new URLSearchParams() },
    }
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})




