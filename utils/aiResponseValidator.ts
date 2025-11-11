export type AdvisorMarkdown = {
  headline: string
  keyInsights: string[]
  nextSteps: string[]
  followUp: string
}

function extractSection(source: string, title: string, nextTitles: string[]): string | null {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedNext = nextTitles
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .map((t) => `\\*\\*${t}\\*\\*`)
    .join('|')
  const boundary = escapedNext.length ? `(?=${escapedNext}|$)` : '$'
  const pattern = new RegExp(`\\*\\*${escapedTitle}\\*\\*\\s*\\n+([\\s\\S]*?)${boundary}`, 'i')
  const match = source.match(pattern)
  if (!match) return null
  return match[1].trim()
}

function normalizeList(lines: string[], prefixPattern: RegExp): string[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(prefixPattern, '').trim())
    .filter((line) => line.length > 0)
}

export function parseAdvisorMarkdown(raw: string | null | undefined): AdvisorMarkdown | null {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed) return null

  const headlineMatch = trimmed.match(/^\s*\*\*(.+?)\*\*/)
  if (!headlineMatch) return null
  const headline = headlineMatch[1].trim()
  if (!headline) return null

  const sectionsSource = trimmed.slice(headlineMatch[0].length).trim()

  const keyInsightsSection = extractSection(sectionsSource, 'Key Insights', ['Next Steps', 'Follow-up Question'])
  const nextStepsSection = extractSection(sectionsSource, 'Next Steps', ['Follow-up Question'])
  const followUpSection = extractSection(sectionsSource, 'Follow-up Question', [])

  if (!keyInsightsSection || !nextStepsSection || !followUpSection) {
    return null
  }

  const keyInsights = normalizeList(keyInsightsSection.split('\n'), /^[-•]\s*/)
  const nextSteps = normalizeList(nextStepsSection.split('\n'), /^✅\s*/)
  const followUpLines = normalizeList(followUpSection.split('\n'), /^[-•]\s*/)
  const followUp = followUpLines[0]?.replace(/^[?•-]+\s*/, '').trim() ?? ''

  if (!keyInsights.length || !nextSteps.length || !followUp) {
    return null
  }

  return {
    headline,
    keyInsights,
    nextSteps,
    followUp,
  }
}

