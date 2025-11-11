import { describe, expect, it } from 'vitest'
import { formatAdvisorResponse, buildFallbackResponse, buildIntentAwareFallback } from '@/lib/ai/chat-response'

function fallback() {
  return 'fallback'
}

describe('formatAdvisorResponse', () => {
  it('returns fallback when empty', () => {
    expect(formatAdvisorResponse('', fallback)).toBe('fallback')
  })

  it('normalizes a well-structured response', () => {
    const input = `**Headline**

**Key Insights**
- Point A → detail → example

**Next Steps**
✅ Do this

What now?`
    const output = formatAdvisorResponse(input, fallback)
    expect(output).toMatch(/\*\*Key Insights\*\*\n- Point A/)
    expect(output).toMatch(/\*\*Next Steps\*\*\n✅ Do this/)
    expect(output.trim().endsWith('What now?')).toBe(true)
  })

  it('coerces messy content into structured output', () => {
    const input = `Headline without bold
Top Options
• Benefit → Why → Example

Next Steps:
- Build a project

Question: What next`
    const output = formatAdvisorResponse(
      input,
      () => buildFallbackResponse({ stage: 'college_student', intent: 'career', message: 'coding' })
    )
    expect(output).toMatch(/\*\*Key Insights\*\*/)
    expect(output).toMatch(/\*\*Next Steps\*\*/)
    expect(output).toMatch(/\?$/)
  })

  it('creates a career-focused fallback when intent is career', () => {
    const fallback = buildIntentAwareFallback({
      stage: 'college_student',
      intent: 'career',
      message: 'I like coding',
    })
    expect(fallback).toMatch(/\*\*Key Insights\*\*\n- /)
    expect(fallback).toMatch(/✅ Shortlist two/)
  })
})


