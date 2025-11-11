import { describe, it, expect } from 'vitest'
import { parseAdvisorMarkdown } from '@/utils/aiResponseValidator'
import { sanitizeAssistantContent } from '@/lib/ai/chat-response'

const SAMPLE_RESPONSE = `**Strategic next move toward data science**

**Key Insights**
- Build statistical depth → Helps you reason about models, not just use them.
- Ship portfolio projects → Shows employers evidence of real-world impact.
- Network with practitioners → Shortens the path to referrals.

**Next Steps**
✅ Complete a probability refresher course this week.
✅ Publish a case study on Kaggle results with business framing.

**Follow-up Question**
- Which insight feels most urgent to tackle first?`

describe('parseAdvisorMarkdown', () => {
  it('parses a valid advisor response', () => {
    const parsed = parseAdvisorMarkdown(SAMPLE_RESPONSE)
    expect(parsed).not.toBeNull()
    expect(parsed?.headline).toBe('Strategic next move toward data science')
    expect(parsed?.keyInsights).toHaveLength(3)
    expect(parsed?.nextSteps).toHaveLength(2)
    expect(parsed?.followUp).toBe('Which insight feels most urgent to tackle first?')
  })

  it('returns null when sections are missing', () => {
    expect(
      parseAdvisorMarkdown(`**Headline**\n\n**Key Insights**\n- item\n\n**Next Steps**\n✅ step`)
    ).toBeNull()
  })

  it('handles malformed input gracefully', () => {
    expect(parseAdvisorMarkdown('')).toBeNull()
    expect(parseAdvisorMarkdown(undefined as unknown as string)).toBeNull()
  })

  it('parses content once sanitized from think tags', () => {
    const raw = `<think>internal reasoning</think>\n\n${SAMPLE_RESPONSE}`
    const cleaned = sanitizeAssistantContent(raw)
    const parsed = parseAdvisorMarkdown(cleaned)
    expect(parsed).not.toBeNull()
    expect(parsed?.keyInsights).toHaveLength(3)
    expect(cleaned).not.toMatch(/\[\d+\]/)
  })

  it('removes numeric citation markers while keeping punctuation tidy', () => {
    const raw =
      '**Headline**[1][2]\n\n**Key Insights**\n- Build projects for proof.[3]\n- Practice interviews regularly [4][5].'
    const cleaned = sanitizeAssistantContent(raw)
    expect(cleaned).toBe(
      '**Headline**\n\n**Key Insights**\n- Build projects for proof.\n- Practice interviews regularly.'
    )
  })
})

