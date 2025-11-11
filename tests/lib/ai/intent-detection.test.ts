import { describe, it, expect } from 'vitest'
import { detectIntent } from '@/lib/ai/chat-response'

describe('enhanced intent detection', () => {
  it('classifies salary negotiation intents', () => {
    const result = detectIntent('How should I negotiate this software engineer offer in Manila?')
    expect(result.category).toBe('salary_negotiation')
  })

  it('classifies job search intents', () => {
    const result = detectIntent('What is the smartest way to run my job search for product roles?')
    expect(result.category).toBe('job_search')
  })

  it('falls back to clarification when message is too short', () => {
    const result = detectIntent('help me')
    expect(result.category).toBe('clarification')
  })
})



