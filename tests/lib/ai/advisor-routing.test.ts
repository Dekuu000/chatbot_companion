import { describe, it, expect } from 'vitest'
import { shouldUseAdvisorFlow } from '@/lib/ai/advisor-routing'

describe('shouldUseAdvisorFlow', () => {
  it('returns false for factual questions', () => {
    expect(shouldUseAdvisorFlow('What is recursion?')).toBe(false)
    expect(shouldUseAdvisorFlow('Explain how does caching work.')).toBe(false)
  })

  it('returns true when advisor keywords are present', () => {
    expect(shouldUseAdvisorFlow('What skills do I need for software engineering?')).toBe(true)
    expect(shouldUseAdvisorFlow('Give me interview tips')).toBe(true)
  })

  it('returns false for short clarifying prompts', () => {
    expect(shouldUseAdvisorFlow('coding')).toBe(false)
    expect(shouldUseAdvisorFlow('job?')).toBe(true)
  })

  it('defaults to advisor flow for longer ambiguous prompts', () => {
    expect(shouldUseAdvisorFlow('I am unsure which direction to take for my future work path')).toBe(true)
  })

  it('handles empty or undefined messages', () => {
    expect(shouldUseAdvisorFlow('')).toBe(false)
    expect(shouldUseAdvisorFlow(undefined as unknown as string)).toBe(false)
  })
})

