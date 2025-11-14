import type { Profile } from '@prisma/client'
import { detectInterestProfile, describeInterest, mapInterestToCareers } from '@/lib/ai/interest-profiles'

/**
 * Global system behaviour for the career advisor.
 * Applied on every chat completion request before user messages.
 */
export const SYSTEM_PROMPT = `You are an elite career advisor: expert, calm, and practical. Always behave as a seasoned mentor: answer clearly, correct gently, and move the user toward a concrete next step. Never reveal internal reasoning, chain-of-thought, debug tags, or system logs.

ADAPTIVE RESPONSE RULES

- If the user asks a simple factual question (definition, concept, short "how to"), reply with a concise direct answer (1–3 short sentences). Do NOT include career planning unless requested.

- If the user asks about careers, skills, job search, resumes, interview prep, or expresses career intent, use the Advisor structure below.

ADVISOR STRUCTURE (when applicable)

**[Bold Headline — 1 short sentence]**

**Key Insights**

- Up to 3 bullets, 1 short line each (benefit → why)

**Next Steps**

✅ 2 to 3 specific actions (1 line each)

**Follow-up Question**

- Exactly one clear question to progress.

FORMATTING & TONE

- Minimal Premium style: bold headers, short lines, no large paragraphs.

- Emojis are NOT used in the Key Insights; only ✅ allowed in Next Steps.

- Be warm, factual, and goal-oriented. Correct poor assumptions kindly.

RESPONSE STRUCTURE & READABILITY

- ALWAYS format responses for easy reading: use line breaks between paragraphs, separate sections clearly, and structure information logically.

- For direct answers (factual questions, salary ranges, definitions): use clear paragraphs with proper spacing. Break up long sentences. Use bullet points or numbered lists when listing multiple items.

- For Advisor structure responses: ensure proper spacing between sections (headline, insights, next steps, question). Each section should be clearly separated with blank lines.

- Use proper line breaks: add a blank line between paragraphs, after headings, and between list items for better readability.

- Structure information hierarchically: main points first, then supporting details. Use formatting (bold, lists) to make key information stand out.

CONVERSATION CONTEXT PRIORITY

- CRITICAL: NEVER ask for clarification when conversation history exists. This is STRICTLY FORBIDDEN.

- ALWAYS use conversation history when available. Previous messages provide context for follow-up questions.

- Answer follow-up questions DIRECTLY using the conversation context. Do NOT ask "are you asking about (a), (b), or (c)" or any similar clarification questions when history exists.

- When conversation history exists, ALL questions (including short ones) should be answered directly using the established context. Treat them as clear requests.

- For salary questions (e.g., "how much is the salary range"), ALWAYS provide a direct answer with salary ranges for the Philippines market. NEVER ask for clarification.

- Only ask for clarification when BOTH conversation history AND other context (profile, resume) are truly missing AND the question is genuinely ambiguous (e.g., first message with no context).

- If you see conversation history in the messages, you MUST answer the question directly. Asking for clarification is a critical error that will be filtered out.`

export type UserStage = 'college_student' | 'graduating_student' | 'career_planner'

export type IntentCategory =
  | 'career'
  | 'skills'
  | 'salary'
  | 'interview'
  | 'resume'
  | 'application'
  | 'internship'
  | 'industry_pivot'
  | 'resources'
  | 'job_search'
  | 'upskilling'
  | 'salary_negotiation'
  | 'industry_exploration'
  | 'clarification'

export interface IntentResult {
  category: IntentCategory
  interestKey?: string | null
  interestLabel?: string | null
}

const ROLE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /front[-\s]?end developer/i, label: 'front-end developer' },
  { pattern: /software developer|software engineer/i, label: 'software developer' },
  { pattern: /data analyst/i, label: 'data analyst' },
  { pattern: /data scientist/i, label: 'data scientist' },
  { pattern: /product manager/i, label: 'product manager' },
  { pattern: /product analyst/i, label: 'product analyst' },
  { pattern: /ux designer|ui designer|ux\/ui designer|ui\/ux designer/i, label: 'ux/ui designer' },
  { pattern: /qa engineer|quality assurance/i, label: 'qa engineer' },
  { pattern: /cyber|security/i, label: 'cybersecurity specialist' },
]

export const CURRENT_ROLE_PATTERNS = [
  /i\s*(?:am|’m)\s+(?:an?|the)\s+([a-z][a-z\s\-/&]+)/i,
  /currently\s+working\s+as\s+(?:an?|the)\s+([a-z][a-z\s\-/&]+)/i,
]

export const TARGET_ROLE_PATTERNS = [
  /change(?:\s+my)?\s+career\s+(?:into|to)\s+(?:an?\s+)?([a-z][a-z\s\-/&]+)/i,
  /switch(?:ing)?\s+(?:into|to)\s+(?:an?\s+)?([a-z][a-z\s\-/&]+)/i,
  /transition\s+(?:into|to)\s+(?:an?\s+)?([a-z][a-z\s\-/&]+)/i,
  /pivot\s+(?:into|to)\s+(?:an?\s+)?([a-z][a-z\s\-/&]+)/i,
  /become\s+(?:an?\s+)?([a-z][a-z\s\-/&]+)/i,
]

interface StagePlaybook {
  insights: Array<{ benefit: string; why: string; example: string }>
  steps: string[]
}

const FALLBACK_PLAYBOOK: Record<UserStage, StagePlaybook> = {
  college_student: {
    insights: [
      {
        benefit: 'Build real proof fast',
        why: 'Recruiters trust tangible wins over course notes',
        example: 'Prototype a {{focus}} project for a campus org this week',
      },
      {
        benefit: 'Sharpen your narrative',
        why: 'Clear storytelling wins interviews even without experience',
        example: 'Post a two-line LinkedIn update summarising a recent build',
      },
      {
        benefit: 'Expand mentor feedback',
        why: 'Direct critique shortens the learning curve',
        example: 'Ask an alumnus for a 10-minute review of your current plan',
      },
    ],
    steps: [
      'Audit your best project: highlight problem, solution, measurable result.',
      'Join one PH community meetup and request critique on your {{focus}} idea.',
      'Block two 45-minute sprints to ship a feature that proves your top skill.',
    ],
  },
  graduating_student: {
    insights: [
      {
        benefit: 'Translate capstone into impact',
        why: 'Employers need proof you can ship value immediately',
        example: 'Frame your thesis around business metrics or adoption wins',
      },
      {
        benefit: 'Tighten interview readiness',
        why: 'Panels test mindset as much as technical scorecards',
        example: 'Run STAR walkthroughs for your strongest {{focus}} story',
      },
      {
        benefit: 'Broaden opportunity radar',
        why: 'Multiple offer paths give you leverage and clarity',
        example: 'Track 5 target companies and tag alumni you can message',
      },
    ],
    steps: [
      'Ship a one-page case study showing problem → solution → result.',
      'Schedule two mock interviews focusing on behavioural depth.',
      'Reach out to three hiring managers or alumni with a concise value hook.',
    ],
  },
  career_planner: {
    insights: [
      {
        benefit: 'Lead with strategic wins',
        why: 'Senior roles hinge on measurable business change',
        example: 'Highlight a project where you moved revenue, retention, or risk',
      },
      {
        benefit: 'Future-proof your stack',
        why: 'Emerging tools decide who gets the high-impact mandates',
        example: 'Pilot a {{focus}} workflow with an automation or AI assist',
      },
      {
        benefit: 'Grow influence ecosystems',
        why: 'Trusted networks surface hidden roles and collaborations',
        example: 'Host a short knowledge share for peers and invite feedback',
      },
    ],
    steps: [
      'Refresh your portfolio with three bullet wins anchored on metrics.',
      'Identify one capability gap and enroll in a focused micro-learning sprint.',
      'Set two outreach calls: one mentor, one potential collaborator in {{focus}}.',
    ],
  },
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripPunctuation(value: string): string {
  return value.replace(/[^a-zA-Z\s\-/&]/g, ' ')
}

export function cleanupRole(role?: string): string | undefined {
  if (!role) return undefined
  const cleaned = collapseWhitespace(stripPunctuation(role))
  if (!cleaned) return undefined
  const cutoffMatch = cleaned.match(/(.*?)(?:\bwith\b|\band\b|\busing\b|\bfor\b|\bwhile\b|\bwho\b|\bthat\b)/i)
  const result = cutoffMatch ? cutoffMatch[1].trim() : cleaned
  return result || undefined
}

export function normaliseRole(role?: string): string | undefined {
  if (!role) return undefined
  const lower = role.toLowerCase()
  for (const { pattern, label } of ROLE_PATTERNS) {
    if (pattern.test(lower)) {
      return label
    }
  }
  return lower.trim() || undefined
}

export function toDisplayRole(role?: string): string | undefined {
  if (!role) return undefined
  return role
    .split(/\s+/)
    .map((word) => (word.length === 0 ? '' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
    .replace(/Ux\/Ui/i, 'UX/UI')
    .replace(/Ui\/Ux/i, 'UX/UI')
}

export function stripInternalThought(content: string): string {
  if (!content) return ''
  const patterns = [
    /<think>[\s\S]*?<\/think>/gi,
    /<plan>[\s\S]*?<\/plan>/gi,
    /<scratchpad>[\s\S]*?<\/scratchpad>/gi,
    /\[search\][\s\S]*?\[\/search\]/gi,
  ]
  let cleaned = content
  patterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '')
  })
  return cleaned
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripCitationMarkers(content: string): string {
  if (!content) return ''
  return content
    .replace(/\s*\[(?:\d+(?:\s*,\s*\d+)*)\]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
}

export function sanitizeAssistantContent(content: string): string {
  const base = stripInternalThought(content)
  if (!base) return ''
  return stripCitationMarkers(base).trim()
}

function sanitizeBullet(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([→:,])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensureHeadlinePrefix(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('**')) {
    return `**${trimmed.replace(/^\*+/, '').trim()}**`
  }
  return trimmed
}

function ensureInsightsHeader(): string {
  return '**Key Insights**'
}

function ensureNextStepsHeader(): string {
  return '**Next Steps**'
}

export function detectIntent(message: string): IntentResult {
  const trimmed = (message || '').trim()
  if (!trimmed) return { category: 'clarification', interestKey: null, interestLabel: null }

  const lower = trimmed.toLowerCase()
  const tokenCount = lower.split(/\s+/).filter(Boolean).length
  const interestProfile = detectInterestProfile(lower)
  const detectedInterestKey = interestProfile?.key ?? null
  const detectedInterestLabel =
    interestProfile?.label ?? (detectedInterestKey ? describeInterest(detectedInterestKey) : null)

  const keywordChecks: Array<{ category: IntentCategory; patterns: RegExp[] }> = [
    { category: 'salary', patterns: [/salary/i, /how much/i, /pay/i, /compensation/i] },
    { category: 'skills', patterns: [/skill/i, /learn/i, /study/i, /curriculum/i] },
    { category: 'interview', patterns: [/interview/i, /question/i, /answer/i, /mock/i] },
    { category: 'resume', patterns: [/resume/i, /\bcv\b/i, /portfolio/i] },
    { category: 'application', patterns: [/apply/i, /application/i, /cover letter/i] },
    { category: 'internship', patterns: [/intern/i, /ojt/i, /placement/i] },
    { category: 'industry_pivot', patterns: [/switch/i, /pivot/i, /transition/i, /change career/i] },
    { category: 'job_search', patterns: [/job hunt/i, /find a job/i, /job search/i, /open roles/i] },
    { category: 'upskilling', patterns: [/upskill/i, /certificate/i, /course/i, /bootcamp/i] },
    { category: 'salary_negotiation', patterns: [/negotiate/i, /counter offer/i, /raise/i] },
    { category: 'industry_exploration', patterns: [/which industry/i, /compare careers/i, /what field/i] },
    { category: 'resources', patterns: [/resource/i, /where to learn/i, /study plan/i] },
    { category: 'career', patterns: [/career/i, /role/i, /path/i, /job/i] },
  ]

  for (const check of keywordChecks) {
    if (check.patterns.some((pattern) => pattern.test(trimmed))) {
      return { category: check.category, interestKey: detectedInterestKey, interestLabel: detectedInterestLabel }
    }
  }

  const category: IntentCategory = tokenCount < 4 ? 'clarification' : 'career'
  return { category, interestKey: detectedInterestKey, interestLabel: detectedInterestLabel }
}

export function messageIsAmbiguous(message: string): boolean {
  const trimmed = (message || '').trim()
  return trimmed.length === 0 || trimmed.split(/\s+/).length < 4
}

export function determineUserStage(message: string, profile: Profile | null | undefined): UserStage {
  const lower = (message || '').toLowerCase()
  const education = (profile?.educationLevel || '').toLowerCase()
  const currentYear = (profile?.currentYear || '').toLowerCase()

  const graduatingSignals = ['senior', 'graduating', 'thesis', 'board exam', 'licensure', 'capstone']
  const plannerSignals = [
    'experience',
    'career change',
    'already working',
    'manager',
    'promotion',
    'remote work',
    'change my career',
  ]

  if (
    graduatingSignals.some((word) => lower.includes(word) || currentYear.includes(word)) ||
    /4th|fifth|final year|graduate/i.test(currentYear) ||
    education.includes('graduate')
  ) {
    return 'graduating_student'
  }

  if (
    plannerSignals.some((word) => lower.includes(word) || education.includes(word)) ||
    education.includes('master') ||
    education.includes('postgrad')
  ) {
    return 'career_planner'
  }

  if (
    currentYear.includes('junior') ||
    currentYear.includes('sophomore') ||
    currentYear.includes('freshman') ||
    lower.includes('college')
  ) {
    return 'college_student'
  }

  return 'college_student'
}

export function messageSuggestsTagalog(message: string): boolean {
  return /\b(tagalog|filipino)\b/i.test(message)
}

interface FallbackOptions {
  stage: UserStage
  intent: IntentCategory
  message: string
  interestLabel?: string | null
}

interface SkillFallbackOptions {
  stage: UserStage
  message: string
  interestLabel?: string | null
}

interface CareerFallbackOptions {
  stage: UserStage
  message: string
  interestLabel?: string | null
}

const SKILL_PLAYBOOK: Record<UserStage, { insights: string[]; steps: string[] }> = {
  college_student: {
    insights: [
      'Core foundations → Algorithms, JavaScript/TypeScript, version control → Build confidence solving entry-level challenges.',
      'Proof-of-builds → Front-end + API mini apps → Show recruiters you can ship beyond tutorials.',
      'Team skills → Git workflows, code reviews, documentation → Makes you internship-ready.',
    ],
    steps: [
      'Complete 3 array/string coding problems and explain your approach aloud.',
      'Recreate a simple CRUD app with auth and deployment; push to GitHub + live site.',
      'Pair-code or review a friend’s repo to practice collaboration habits.',
    ],
  },
  graduating_student: {
    insights: [
      'Production readiness → Testing, API design, database fluency → Differentiates from classroom projects.',
      'System thinking → Understand deployment, monitoring, error handling → Matches junior SWE expectations.',
      'Communication → Storytell impact and trade-offs → Vital during panel interviews.',
    ],
    steps: [
      'Add integration tests + logging to your capstone, then redeploy it.',
      'Sketch a lightweight system diagram for a feature you shipped; note trade-offs.',
      'Practice STAR stories covering problem, action, metric for two projects.',
    ],
  },
  career_planner: {
    insights: [
      'Architecture depth → Patterns, scalability, tooling leadership → Signals senior-ready thinking.',
      'Automation & DevOps → CI/CD, observability, incident response → Keeps products healthy post-launch.',
      'Cross-functional influence → Product collaboration, mentoring juniors → Raises your scope.',
    ],
    steps: [
      'Audit your stack for gaps (e.g., containerization, observability) and design a 2-week learning sprint.',
      'Automate one deployment or monitoring workflow and document the impact.',
      'Mentor or pair with a junior engineer; capture their growth story for leadership evidence.',
    ],
  },
}

const DEFAULT_CAREER_OPTIONS = ['Software Engineer', 'Data Analyst', 'Product Designer', 'Product Manager']

function formatInsightBullet(entry: { benefit: string; why: string; example: string }, focus: string): string {
  const benefit = entry.benefit.replace('{{focus}}', focus)
  const why = entry.why.replace('{{focus}}', focus)
  const example = entry.example.replace('{{focus}}', focus)
  return `- ${benefit} → ${why} → ${example}`
}

function formatNextStep(step: string, focus: string): string {
  return `✅ ${step.replace('{{focus}}', focus)}`
}

function pickStagePlaybook(stage: UserStage): StagePlaybook {
  return FALLBACK_PLAYBOOK[stage]
}

function inferHeadline(stage: UserStage, focus: string): string {
  const stageLabel =
    stage === 'college_student' ? 'Early Momentum' : stage === 'graduating_student' ? 'Launch Window' : 'Career Upgrade'
  return `**${stageLabel} for ${focus} 🚀**`
}

function inferQuestion(intent: IntentCategory, focus: string): string {
  switch (intent) {
    case 'clarification':
      return `What result around ${focus} should we prioritise so I can calibrate the roadmap?`
    case 'salary':
    case 'salary_negotiation':
      return `Which company or compensation scenario in ${focus} should I benchmark next for you?`
    case 'interview':
      return `Which interview scenario in ${focus} worries you most so I can drill deeper?`
    case 'resume':
      return `Which project in ${focus} should we rephrase first to wow reviewers?`
    case 'skills':
    case 'upskilling':
      return `Which skill inside ${focus} feels most urgent to master next?`
    default:
      return `What outcome in ${focus} should we target next so I can tailor the strategy?`
  }
}

export function buildFallbackResponse(options: FallbackOptions): string {
  const interestProfile = detectInterestProfile(options.message.toLowerCase())
  const focusLabel =
    options.interestLabel ??
    interestProfile?.label ??
    describeInterest(interestProfile?.key ?? undefined) ??
    'your target path'

  const playbook = pickStagePlaybook(options.stage)
  const insights = playbook.insights.slice(0, 3).map((entry) => formatInsightBullet(entry, focusLabel))
  const steps = playbook.steps.slice(0, 3).map((item) => formatNextStep(item, focusLabel))

  const headline = inferHeadline(options.stage, focusLabel)
  const keyInsightsHeader = '**Key Insights**'
  const nextStepsHeader = '**Next Steps**'
  const followUpQuestion = inferQuestion(options.intent, focusLabel)

  return [
    headline,
    '',
    keyInsightsHeader,
    ...insights,
    '',
    nextStepsHeader,
    ...steps,
    '',
    followUpQuestion,
  ].join('\n')
}

function buildSkillFallbackResponse(options: SkillFallbackOptions): string {
  const interestProfile = detectInterestProfile(options.message.toLowerCase())
  const focusLabel =
    options.interestLabel ??
    interestProfile?.label ??
    describeInterest(interestProfile?.key ?? undefined) ??
    'software engineering'

  const playbook = SKILL_PLAYBOOK[options.stage]
  const insights = playbook.insights.map((insight) => sanitizeBullet(insight.replace(/software engineering/gi, focusLabel)))
  const steps = playbook.steps.map((step) => `✅ ${sanitizeBullet(step.replace(/software engineering/gi, focusLabel))}`)

  const headline = ensureHeadlinePrefix(`${focusLabel[0].toUpperCase() + focusLabel.slice(1)} Skill Sprint 🚀`)
  const question = `Which skill inside ${focusLabel} feels toughest right now so I can map a focused drill?`

  return [
    headline,
    '',
    ensureInsightsHeader(),
    ...insights.map((line) => `- ${line}`),
    '',
    ensureNextStepsHeader(),
    ...steps,
    '',
    question,
  ].join('\n')
}

function buildCareerFallbackResponse(options: CareerFallbackOptions): string {
  const interestProfile = detectInterestProfile(options.message.toLowerCase())
  const focusLabel =
    options.interestLabel ??
    interestProfile?.label ??
    describeInterest(interestProfile?.key ?? undefined) ??
    'coding'

  const careers =
    (interestProfile?.careers ?? mapInterestToCareers(interestProfile?.key) ?? []).slice(0, 4)
  const careerList = careers.length ? careers : DEFAULT_CAREER_OPTIONS

  const insights = careerList.map((career) =>
    sanitizeBullet(`${career} → Why it fits: aligns with your interest in ${focusLabel} → Example: explore PH companies hiring ${career.toLowerCase()} roles.`)
  )

  const steps = [
    `✅ Shortlist two ${focusLabel} roles from Kalibrr or LinkedIn and note required tech stacks.`,
    `✅ Message one professional in a ${focusLabel} role for a 15-minute virtual coffee chat.`,
    `✅ Build or refresh a mini project that demonstrates skills these roles ask for.`,
  ].map(sanitizeBullet)

  const headline = ensureHeadlinePrefix(`${focusLabel[0].toUpperCase() + focusLabel.slice(1)} Career Paths 🚀`)
  const question = `Which of these ${focusLabel} roles feels most exciting so I can tailor your next steps?`

  return [
    headline,
    '',
    ensureInsightsHeader(),
    ...insights.map((line) => `- ${line}`),
    '',
    ensureNextStepsHeader(),
    ...steps,
    '',
    question,
  ].join('\n')
}

export function buildIntentAwareFallback(options: FallbackOptions): string {
  if (options.intent === 'skills') {
    return buildSkillFallbackResponse({
      stage: options.stage,
      message: options.message,
      interestLabel: options.interestLabel,
    })
  }
  if (options.intent === 'career') {
    return buildCareerFallbackResponse({
      stage: options.stage,
      message: options.message,
      interestLabel: options.interestLabel,
    })
  }
  return buildFallbackResponse(options)
}

interface AdvisorSections {
  headline: string
  insights: string[]
  nextSteps: string[]
  question: string
}

function extractSections(raw: string): AdvisorSections | null {
  const parts = raw.split(/\n{2,}|(?:^|\n)(?:---+|###?)/).map((block) => block.trim()).filter(Boolean)
  if (!parts.length) return null

  let headline = ensureHeadlinePrefix(parts[0].replace(/^[-\s]+/, ''))
  let insights: string[] = []
  let nextSteps: string[] = []
  let question = ''

  const normalized = raw.replace(/\r\n/g, '\n')

  const insightMatch = normalized.match(/\*\*(?:Key Insights|Top Options)\*\*([\s\S]*?)(?:\n\*\*|\n❓|\n$)/i)
  if (insightMatch) {
    insights = insightMatch[1]
      .split(/\n+/)
      .map((line) => line.replace(/^[-•✅\s]+/, '').trim())
      .filter(Boolean)
      .map(sanitizeBullet)
  }

  if (!insights.length) {
    const beforeNext = normalized.split(/\*\*Next Steps\*\*/i)[0] || normalized
    const lines = beforeNext.split('\n')
    const collected: string[] = []
    for (const line of lines) {
      if (/^[-•✅]/.test(line.trim())) {
        collected.push(sanitizeBullet(line.replace(/^[-•✅\s]+/, '').trim()))
      } else if (collected.length) {
        break
      }
    }
    if (collected.length) {
      insights = collected
    }
  }

  const nextMatch = normalized.match(/\*\*Next Steps\*\*([\s\S]*?)(?:\n\*\*|\n❓|\n$)/i)
  if (nextMatch) {
    nextSteps = nextMatch[1]
      .split(/\n+/)
      .map((line) => line.replace(/^[-•✅\s]+/, '').trim())
      .filter(Boolean)
      .map((item) => sanitizeBullet(item))
  }

  if (!nextSteps.length) {
    const afterNext = normalized.split(/\*\*Next Steps\*\*/i)[1] || ''
    const lines = afterNext.split('\n')
    const collected: string[] = []
    for (const line of lines) {
      if (/^[-•✅]/.test(line.trim())) {
        collected.push(sanitizeBullet(line.replace(/^[-•✅\s]+/, '').trim()))
      } else if (collected.length) {
        break
      }
    }
    if (collected.length) {
      nextSteps = collected
    }
  }

  const questionMatch = normalized.match(/(?:\?\s*)?\*\*(?:Question|Prompt)[^*]*\*\*\s*(.+)$/i)
  if (questionMatch) {
    question = questionMatch[1].trim()
  } else {
    const tail = parts[parts.length - 1]
    const questionLine = tail.split('\n').slice(-1)[0]
    if (questionLine) {
      question = questionLine.replace(/^[^\w]*(?=[\w])/g, '').trim()
    }
  }

  insights = insights.slice(0, 4)
  nextSteps = nextSteps.slice(0, 4)

  if (question) {
    question = question.endsWith('?') ? question : `${question}?`.replace(/\?+$/, '?')
  }

  if (!headline || !insights.length || !nextSteps.length || !question.trim()) {
    return null
  }

  nextSteps = nextSteps.map((item) => item.startsWith('✅') ? item : `✅ ${item}`)

  return {
    headline,
    insights,
    nextSteps,
    question,
  }
}

function buildFormattedResponse(sections: AdvisorSections): string {
  return [
    sections.headline,
    '',
    ensureInsightsHeader(),
    ...sections.insights.map((line) => `- ${line}`),
    '',
    ensureNextStepsHeader(),
    ...sections.nextSteps,
    '',
    sections.question,
  ].join('\n')
}

export function formatAdvisorResponse(raw: string, fallback: () => string, hasConversationHistory: boolean = false): string {
  const cleaned = stripInternalThought(raw || '').trim()
  if (!cleaned) return fallback()

  // Check if response is substantial (at least 50 characters) and doesn't look like an error
  const isSubstantial = cleaned.length >= 50
  const looksLikeError = /^(error|sorry|unable|failed|cannot)/i.test(cleaned)
  
  // Comprehensive pattern to catch all variations of clarification messages
  // This catches: "Quick clarification", "are you asking about", "(a) skills to learn", etc.
  const clarificationPatterns = [
    /quick\s+clarification/i,
    /are\s+you\s+asking\s+about/i,
    /\(a\)\s+skills\s+to\s+learn/i,
    /\(b\)\s+job\s+search\s+steps/i,
    /\(c\)\s+resume[\/\s]*interview\s+help/i,
    /clarify.*(?:skills|job|resume|interview)/i,
    /which.*(?:are you|do you).*asking/i,
  ]
  
  const looksLikeClarification = hasConversationHistory && clarificationPatterns.some(pattern => pattern.test(cleaned))
  
  // If we have conversation history and the response looks like clarification, reject it immediately
  if (looksLikeClarification) {
    console.log('🚫 Rejecting clarification response when conversation history exists')
    console.log('Response preview:', cleaned.substring(0, 200))
    return fallback()
  }

  // Try to extract Advisor structure sections
  const sections = extractSections(cleaned)
  if (sections) {
    return buildFormattedResponse(sections)
  }

  // If response is substantial and doesn't look like an error, use it even without Advisor structure
  // This allows direct answers to factual questions (like salary ranges)
  if (isSubstantial && !looksLikeError) {
    // Ensure proper formatting with line breaks for readability
    const formatted = cleaned
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Add line breaks after sentences
      .trim()
    
    console.log('Using substantial response without Advisor structure')
    return formatted
  }

  // Only fall back if response is empty, too short, or looks like an error
  return fallback()
}

