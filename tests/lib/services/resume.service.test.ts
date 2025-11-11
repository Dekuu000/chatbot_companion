import { describe, expect, it } from 'vitest'
import { buildFallbackResumeAnalysis, formatResumeAnalysisMessage } from '@/lib/services/resume.service'

describe('resume service helpers', () => {
  it('buildFallbackResumeAnalysis returns structured tips', () => {
    const sampleText = 'Led software projects and collaborated with developers. Improved process efficiency.'
    const result = buildFallbackResumeAnalysis(sampleText)

    expect(result.overallScore).toBeGreaterThan(0)
    expect(result.improvementSuggestions?.length).toBeGreaterThan(0)
    expect(result.strengths?.length).toBeGreaterThan(0)
    expect(result.skillsIdentified?.length).toBeGreaterThan(0)
  })

  it('formatResumeAnalysisMessage prints readable sections', () => {
    const analysis = buildFallbackResumeAnalysis('Managed projects and built dashboards for clients.')
    const formatted = formatResumeAnalysisMessage({
      analysis,
      resumeName: 'sample.pdf',
      userPrompt: 'Please focus on data roles.',
    })

    expect(formatted).toContain('Here’s what I spotted')
    expect(formatted).toContain('**Where you’re strong**')
    expect(formatted).toContain('**Opportunities to improve**')
    expect(formatted).toContain('sample.pdf')
    expect(formatted).toContain('Please focus on data roles.')
  })
})
