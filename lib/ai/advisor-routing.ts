export function shouldUseAdvisorFlow(message: string): boolean {
  const m = (message || '').toLowerCase()

  const advisorKeywords = [
    'career',
    'job',
    'role',
    'resume',
    'interview',
    'intern',
    'apply',
    'portfolio',
    'skills',
    'upskill',
    'upskilling',
    'find a job',
    'job search',
    'salary',
    'pivot',
  ]

  const factPatterns = [/what is\b/i, /define\b/i, /explain\b/i, /how does\b/i, /example of\b/i]

  if (factPatterns.some((pattern) => pattern.test(message))) return false

  if (advisorKeywords.some((keyword) => m.includes(keyword))) return true

  const tokens = m
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  if (tokens <= 4) return false

  return true
}

