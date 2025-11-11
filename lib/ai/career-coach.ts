import type { Profile } from '@prisma/client'
import { SYSTEM_PROMPT, cleanupRole, normaliseRole, toDisplayRole, CURRENT_ROLE_PATTERNS, TARGET_ROLE_PATTERNS } from '@/lib/ai/chat-response'
import type { IntentCategory, UserStage } from '@/lib/ai/chat-response'
import {
  describeMarketSnapshot,
  listRecommendedProjects,
} from '@/lib/content/ph-knowledge'
import { describeInterest } from '@/lib/ai/interest-profiles'

// This module converts chat, resume, and profile context into a targeted coaching plan.

export interface ResumeSuggestion {
  area?: string
  suggestion: string
  priority?: string
}

export interface ResumeSnapshot {
  fileName?: string
  uploadedAt?: string
  overallScore?: number | null
  strengths: string[]
  weaknesses: string[]
  improvementSuggestions: ResumeSuggestion[]
  skillsIdentified: string[]
  alignmentCareers: Array<{ title: string; matchScore?: number }>
}

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachingContextInput {
  message: string
  intent: IntentCategory
  stage: UserStage
  profile?: Profile | null
  resume?: ResumeSnapshot | null
  history?: HistoryMessage[]
  interestKey?: string | null
  interestLabel?: string | null
  recommendedCareers?: string[]
}

export interface CoachingContext {
  message: string
  intent: IntentCategory
  stage: UserStage
  targetRole?: string
  targetDisplay?: string
  targetGuideKey?: string
  targetSource?: 'message' | 'history' | 'resume'
  currentRole?: string
  currentDisplay?: string
  resume?: ResumeSnapshot | null
  profileSkills: string[]
  resumeSkills: string[]
  conversationSummary?: string
  resumeSummary?: string
  recentUserMessages: string[]
  missingDetails: string[]
  pivotDetected: boolean
  personaName: string
  personaContext: string
  memorySummary?: string
  rememberedFacts: string[]
  marketSnapshot?: string | null
  recommendedProjects?: string[]
  interestKey?: string | null
  interestLabel?: string | null
  recommendedCareers: string[]
}

export type SessionMode = 'guest' | 'authenticated'

export const USER_STAGE_FOCUS: Record<UserStage, string> = {
  college_student: 'Support exploration, surface PH campus opportunities, and prompt them to test strengths through low-risk projects.',
  graduating_student: 'Highlight entry-level roles, leverage capstone experience, and map the transition to full-time offers.',
  career_planner: 'Provide upskilling pathways, remote-friendly opportunities, and tactical pivots aligned with Philippine market demand.',
}

const INTENT_SCAFFOLDS: Record<IntentCategory, string> = {
  career: 'Diagnose their near-term career direction, compare two viable paths, and prescribe a proof-of-work plan tied to Philippine hiring realities.',
  industry_exploration: 'Help them contrast industries, list pros/cons relevant to PH opportunities, and propose experiments to validate fit.',
  resume: 'Deliver a sharp resume critique: call out top 3 strengths, top 3 fixes, and suggest PH-focused keywords or metrics to insert.',
  interview: 'Design an interview prep sprint: suggest practice questions, scoring rubrics, and situational drills to run this week.',
  job_search: 'Outline a focused job search plan with PH job boards, networking moves, and weekly activity targets.',
  skills: 'Recommend a sequencing of skill sprints, each with learning resources, practice deliverables, and accountability check-ins.',
  upskilling: 'Map a 30-60-90 day upskilling plan aligned with their target role, citing PH-friendly resources and checkpoints.',
  salary: 'Benchmark realistic salary bands in the Philippines and show how to communicate value for their target role.',
  salary_negotiation: 'Coach them through negotiation framing, BATNA, and localized salary data; provide sample phrasing.',
  application: 'Guide them through an application strategy: resume tailoring, cover letter angle, and follow-up cadence.',
  internship: 'Focus on landing internships—cover PH internship cycles, required proof of work, and who to contact.',
  resources: 'Curate high-impact resources with why they matter, expected time investment, and how to apply the learning quickly.',
  industry_pivot: 'Coach them on pivot strategy using transferable wins, skill gap closure, and narrative reframing.',
  clarification: 'Ask one clarifying question to lock the goal, then provide a lightweight next action once they answer.',
}

const DEFAULT_INTENT_SCAFFOLD =
  'Deliver clear, actionable career coaching grounded in Philippine market realities, highlighting measurable next steps.'

export function getIntentScaffold(intent: IntentCategory): string {
  return INTENT_SCAFFOLDS[intent] ?? DEFAULT_INTENT_SCAFFOLD
}

export interface SystemPromptConfig {
  mode: SessionMode
  stage: UserStage
  personaName: string
  personaContext: string
  intent: IntentCategory
  localization?: 'ph' | 'global'
  profileSummary?: string
  resumeSummary?: string
  memorySummary?: string
  skillGaps?: string[]
  priorTags?: {
    intent?: IntentCategory
    stage?: UserStage
    targetRole?: string | null
    goalSummary?: string | null
    interestKey?: string | null
    updatedAt?: string
  }
  targetRole?: string | null
  marketContext?: string | null
  learningTracks?: Array<{ title: string; url: string }>
  interestLabel?: string | null
  recommendedCareers?: string[]
}

/**
 * Combines the global advisor persona with dynamic conversation context.
 * The returned string is appended to the SYSTEM_PROMPT before every model call.
 */
export function buildSystemPrompt(config: SystemPromptConfig): string {
  const context: string[] = []
  const modeLabel = config.mode === 'guest' ? 'Guest Mode' : 'Authenticated Session'
  context.push(`SYSTEM CONTEXT — ${modeLabel}`)
  context.push(`Persona lens: ${config.personaName} — ${config.personaContext}`)
  context.push(`Stage focus: ${USER_STAGE_FOCUS[config.stage]}`)
  context.push(`Coaching mission: ${getIntentScaffold(config.intent)}`)

  if (config.targetRole) {
    context.push(`Primary target role: ${config.targetRole}`)
  }
  if (config.interestLabel) {
    context.push(`Interest to mirror: ${config.interestLabel}`)
  } else if (config.priorTags?.interestKey) {
    const priorInterestLabel = describeInterest(config.priorTags.interestKey)
    if (priorInterestLabel) {
      context.push(`Previous interest focus: ${priorInterestLabel} — keep consistent unless the user pivots.`)
    }
  }
  if (config.recommendedCareers?.length) {
    context.push(`Recommended careers to emphasise: ${config.recommendedCareers.join(', ')}`)
  }

  if (config.localization === 'global') {
    context.push('Localization: Provide globally relevant guidance unless the user explicitly asks for PH specifics.')
  } else {
    context.push('Localization: Default to Philippine market realities—salary bands, hiring practices, and education pathways.')
    if (config.marketContext) {
      context.push(`Philippines labour snapshot:\n${config.marketContext}`)
    }
    if (config.learningTracks?.length) {
      context.push(
        `Relevant PH learning tracks:\n${config.learningTracks
          .map((track) => `- ${track.title} (${track.url})`)
          .join('\n')}`
      )
    }
  }

  if (config.mode === 'guest') {
    context.push(
      'Guest session notice: Do not claim to remember past chats or store personal data. Politely mention that signing in unlocks saved history when suitable.'
    )
  } else {
    context.push(
      config.profileSummary?.trim()
        ? `Profile snapshot: ${config.profileSummary.trim()}`
        : 'Profile snapshot: Limited — invite them to complete details for deeper personalization.'
    )
    context.push(
      config.resumeSummary?.trim()
        ? `Latest resume insights:\n${config.resumeSummary.trim()}`
        : 'Latest resume insights: None captured yet — encourage uploading a resume for richer guidance.'
    )
    if (config.memorySummary?.trim()) {
      context.push(`Remembered facts: ${config.memorySummary.trim()}`)
    }
    if (config.skillGaps?.length) {
      context.push(`Skill gaps or missing context to close: ${config.skillGaps.join(', ')}`)
    }
    if (config.priorTags?.targetRole) {
      context.push(`Previous target role: ${config.priorTags.targetRole}`)
    }
    if (config.priorTags?.goalSummary) {
      context.push(`Last session takeaway: ${config.priorTags.goalSummary}`)
    }
  }

  const dynamicContext = context.filter(Boolean).join('\n\n')
  return [SYSTEM_PROMPT.trim(), dynamicContext].filter(Boolean).join('\n\n\n')
}

interface RoleGuide {
  key: string
  displayName: string
  aliases: RegExp[]
  resumeTips: string[]
  skillPillars: string[]
  weeklyActions: string[]
  resources: string[]
  followUpOptions: string[]
}

const ROLE_GUIDES: Record<string, RoleGuide> = {
  web_developer: {
    key: 'web_developer',
    displayName: 'Web Developer',
    aliases: [/web\s*developer/i, /front[-\s]?end developer/i, /frontend engineer/i, /web\s*dev/i],
    resumeTips: [
      'Quantify impact for each web project (e.g., “Cut bounce rate by 28% after redesign”).',
      'Link to live demos and GitHub repositories so reviewers can inspect your code quickly.',
      'Group tools into “Languages”, “Frameworks”, and “Deployment” for easy scanning.',
    ],
    skillPillars: [
      'Deepen JavaScript & DOM fundamentals by rebuilding two UI components without frameworks.',
      'Strengthen React or Next.js skills—ship a responsive page with routing, state, and API data.',
      'Practice styling systems (Tailwind CSS or CSS Modules) to deliver consistent design systems.',
    ],
    weeklyActions: [
      'Ship a responsive landing page with Next.js + Tailwind and deploy on Vercel; document the tech decisions.',
      'Complete two DOM-focused coding challenges on Frontend Mentor or LeetCode to sharpen problem solving.',
      'Review a Kalibrr posting for Web Developers and mirror three keywords inside your resume summary.',
    ],
    resources: [
      'Kalibrr — filter “Web Developer” roles (Metro Manila + Remote).',
      'JobStreet Philippines — save alerts for “Front-End Developer”.',
      'StackTrek or Zuitt bootcamps for accelerated portfolio building.',
    ],
    followUpOptions: [
      'share top PH job boards hiring web developers right now',
      'generate mock interview questions for junior web developer roles',
      'rewrite a resume bullet to highlight your strongest React project',
    ],
  },
  software_engineer: {
    key: 'software_engineer',
    displayName: 'Software Engineer',
    aliases: [/software engineer/i, /software dev/i, /full[-\s]?stack/i, /backend developer/i],
    resumeTips: [
      'Lead bullets with impact, tech stack, and scale (e.g., “Built REST API in Node.js serving 5K users/day”).',
      'Highlight collaboration—mention squads, agile rituals, or cross-functional partners.',
      'List automated tests, CI/CD, or cloud deployments to show engineering maturity.',
    ],
    skillPillars: [
      'Strengthen data structures and algorithms—solve three problems focusing on arrays and graphs.',
      'Build a full-stack mini-app showcasing CRUD, authentication, and deployment.',
      'Document system design decisions using simple diagrams (sequence or architecture).',
    ],
    weeklyActions: [
      'Implement an API using Node.js/Express or Django and deploy to Render/Heroku with monitoring.',
      'Practice one mock system design question (e.g., design a feature flag service) and summarise trade-offs.',
      'Join a local dev meetup (PythonPH, JS Manila) to expand your network and gain hiring signals.',
    ],
    resources: [
      'LinkedIn Jobs PH — set alerts for “Junior Software Engineer”.',
      'Kalibrr — follow Philippine startups (e.g., Sprout, Kumu, PayMongo).',
      'DICT DigitalJobs PH for upskilling and government-backed programs.',
    ],
    followUpOptions: [
      'share a 30-day coding practice plan tailored to your schedule',
      'prepare behavioural + technical interview questions for software engineers',
      'draft a STAR-format resume bullet that proves your engineering impact',
    ],
  },
  data_analyst: {
    key: 'data_analyst',
    displayName: 'Data Analyst',
    aliases: [/data analyst/i, /analytics/i, /business intelligence/i],
    resumeTips: [
      'Show the decision or KPI impacted by each analysis (e.g., “Raised retention by 6% using cohort study”).',
      'Include tool stacks separately (SQL, Python, Tableau, Power BI) with comfort levels.',
      'Attach links to notebooks or dashboards for portfolio credibility.',
    ],
    skillPillars: [
      'Sharpen SQL joins, window functions, and aggregation by replicating PH business datasets.',
      'Automate analysis pipelines using Python (pandas) or R to clean, analyse, and visualise data.',
      'Practice storytelling by presenting findings with clear business recommendations.',
    ],
    weeklyActions: [
      'Analyze a DOTr or PSA dataset, publish insights on Medium or LinkedIn, and link it in your resume.',
      'Join Analytics Association of the Philippines events to learn hiring expectations.',
      'Solve one Kaggle mini-challenge or Google Data Analytics capstone exercise.',
    ],
    resources: [
      'Kalibrr — search for “Junior Data Analyst” and bookmark preferred companies.',
      'DataCamp/Google Career Certificates for structured analytics pathways.',
      'PH communities: Data Pilipinas, Women in Data PH, Kaggle Philippines.',
    ],
    followUpOptions: [
      'list PH companies hiring data analysts this month',
      'generate SQL + analytics interview questions for practice',
      'help you translate a project into a concise resume bullet',
    ],
  },
  ux_ui_designer: {
    key: 'ux_ui_designer',
    displayName: 'UX/UI Designer',
    aliases: [/ux\/?ui designer/i, /product designer/i, /ui designer/i, /ux designer/i],
    resumeTips: [
      'Lead with the problem, your role, and measurable outcome for each case study.',
      'Include links to interactive prototypes (Figma, Maze) and password hints if needed.',
      'Show collaboration: mention researchers, engineers, or stakeholders you partnered with.',
    ],
    skillPillars: [
      'Conduct at least five user interviews and synthesise insights into opportunity statements.',
      'Create responsive UI systems (mobile + desktop) using auto-layout, variants, and components.',
      'Document end-to-end UX flows—from hypothesis to usability testing results.',
    ],
    weeklyActions: [
      'Redesign a local service (e.g., government portal) and publish a concise case study.',
      'Pair-program with a developer to understand design handoff requirements.',
      'Join UXPH or Design Buddies PH critique sessions for actionable feedback.',
    ],
    resources: [
      'UXPH, Design Buddies PH, and Localhost for networking and critique.',
      'JobStreet + Kalibrr for junior UX roles—set alerts with keywords “UX/UI Designer”.',
      'Interaction Design Foundation or Coursera UX courses for credentialing.',
    ],
    followUpOptions: [
      'share research prompt templates for usability testing',
      'draft a portfolio outline highlighting your strongest project',
      'prepare storytelling-focused interview questions for UX roles',
    ],
  },
  product_manager: {
    key: 'product_manager',
    displayName: 'Product Manager',
    aliases: [/product manager/i, /pm role/i, /product lead/i],
    resumeTips: [
      'Quantify impact (growth, retention, revenue) and highlight cross-functional leadership.',
      'Show evidence of discovery: interviews, experiments, or analytics used for decisions.',
      'Separate “Product Strategy”, “Execution”, and “Insights” bullets for easy scanning.',
    ],
    skillPillars: [
      'Strengthen discovery skills—conduct structured stakeholder and user interviews.',
      'Practice prioritisation using RICE/ICE on real backlog items.',
      'Analyse product metrics (activation, retention, NPS) and propose experiments.',
    ],
    weeklyActions: [
      'Draft a one-page PRD for a PH digital product improvement and share with mentors.',
      'Run a quick experiment (A/B or smoke test) and document the learning.',
      'Shadow an engineering/design sync (or simulate one) to improve collaboration cadence.',
    ],
    resources: [
      'Product Camp Manila and PM Dojo PH communities.',
      'Kalibrr & LinkedIn Jobs — filter “Associate Product Manager”.',
      'Reforge free resources and Lenny’s Newsletter for best practices.',
    ],
    followUpOptions: [
      'share a PRD template tailored for Philippine startups',
      'generate behavioural + product sense interview questions',
      'draft bullet points translating your portfolio or project into PM language',
    ],
  },
  cybersecurity_analyst: {
    key: 'cybersecurity_analyst',
    displayName: 'Cybersecurity Analyst',
    aliases: [/cybersecurity/i, /security analyst/i, /infosec/i, /soc analyst/i],
    resumeTips: [
      'List certifications (CompTIA Security+, CEH) prominently with validity dates.',
      'Describe incidents handled with MITRE ATT&CK or NIST terminology to show structure.',
      'Mention tooling (SIEM, IDS/IPS, OWASP testing) and the scale/environment.',
    ],
    skillPillars: [
      'Sharpen threat detection by practising on TryHackMe/RangeForce labs weekly.',
      'Document incident response playbooks and tabletop exercises.',
      'Learn secure coding or DevSecOps basics to collaborate with engineering teams.',
    ],
    weeklyActions: [
      'Complete one TryHackMe room and write a short reflection on findings.',
      'Attend PH-CERT or local cybersecurity meetups for emerging threat intel.',
      'Set up a home lab (e.g., Security Onion) to simulate detection + response workflows.',
    ],
    resources: [
      'PH-CERT advisories and community events.',
      'Kalibrr & JobStreet — filter “SOC Analyst” or “Cybersecurity”.',
      'DICT Cybersecurity scholarships and SkillsFuture PH programmes.',
    ],
    followUpOptions: [
      'list upcoming PH cybersecurity events and communities',
      'generate technical interview questions for SOC analyst roles',
      'help you craft resume bullets that highlight incident response wins',
    ],
  },
}

const ROLE_GUIDE_LIST = Object.values(ROLE_GUIDES)

const DIRECT_TARGET_PATTERNS = [
  /become\s+(?:an?|the)\s+([a-z][a-z\s\/&\-]+)/i,
  /for\s+(?:an?|the)?\s*([a-z][a-z\s\/&\-]+)\s+plan/i,
  /(?:goal|target|role)\s*:\s*([a-z][a-z\s\/&\-]+)/i,
  /aiming\s+to\s+be\s+(?:an?|the)\s+([a-z][a-z\s\/&\-]+)/i,
  /pursuing\s+(?:an?|the)\s+([a-z][a-z\s\/&\-]+)/i,
]

const KEYWORD_ROLE_MAP: Array<{ keywords: RegExp[]; label: string }> = [
  { keywords: [/coding/i, /programming/i, /web dev/i, /software/i], label: 'web developer' },
  { keywords: [/mobile app/i, /android/i, /ios/i], label: 'mobile developer' },
  { keywords: [/data science/i, /analytics/i, /machine learning/i], label: 'data analyst' },
  { keywords: [/design/i, /ux/i, /ui/i, /creative/i], label: 'ux/ui designer' },
  { keywords: [/call center/i, /bpo/i, /csr/i], label: 'customer service specialist' },
  { keywords: [/nurse/i, /hospital/i, /clinic/i], label: 'healthcare administrator' },
  { keywords: [/marketing/i, /business/i, /operations/i], label: 'marketing strategist' },
]

const INTRO_VARIANTS: string[] = [
  `Let’s cut to the chase: {fitLine}.`,
  `Here’s the reality check — {fitLine}.`,
  `Quick read on your trajectory: {fitLine}.`,
]

const NEXT_STEP_TEMPLATES: string[] = [
  'Next move: rewrite one project bullet with a hard metric tonight so hiring managers notice you fast.',
  'Next move: ship one polished demo this week and document the result in two sentences.',
  'Next move: book 45 minutes today to tighten your strongest project with metrics and collaboration proof.',
]

const FOLLOW_UP_OPTIONS = ['resume tune-up', 'interview prep', 'skills focus', 'job search strategy']

const INDUSTRY_KEYWORDS: Array<{ persona: string; context: string; keywords: RegExp[] }> = [
  {
    persona: 'Senior Tech Career Coach',
    context: 'You specialise in guiding software and IT professionals. Reference engineering hiring loops, tech stack mastery, deployment experience, and portfolio projects.',
    keywords: [/developer|engineer|programmer|software|tech|frontend|backend|fullstack|devops/i],
  },
  {
    persona: 'Professional Healthcare Recruiter',
    context: 'You guide nurses, doctors, med-techs, allied health, and healthcare administrators. Reference licensure, patient care experience, and hospital/clinic hiring realities.',
    keywords: [/nurse|medical|clinic|hospital|healthcare|doctor|medtech|pharmacy/i],
  },
  {
    persona: 'Corporate Career Strategist',
    context: 'You advise business, admin, finance, HR, and operations professionals. Mention corporate structures, KPIs, stakeholder management, and leadership pathways.',
    keywords: [/business|finance|accounting|admin|management|operations|hr|human resources|corporate/i],
  },
  {
    persona: 'Workforce Training Specialist',
    context: 'You focus on BPO and contact centre careers. Reference training metrics, QA scores, voice/non-voice tracks, and night-shift realities.',
    keywords: [/bpo|call center|contact centre|csr|customer service|voice account/i],
  },
  {
    persona: 'Creative Career Mentor',
    context: 'You guide designers, illustrators, multimedia artists, copywriters, and marketers. Reference portfolios, storytelling, creative briefs, and collaboration with product or marketing teams.',
    keywords: [/design|creative|illustration|graphics|ux|ui|product designer|copywriter|art director|branding/i],
  },
]

function safeParseArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

function extractMatch(message: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(message)
    if (match && match[1]) {
      return cleanupRole(match[1])
    }
  }
  return undefined
}

function guessRoleByAliases(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const guide of ROLE_GUIDE_LIST) {
    if (guide.aliases.some((regex) => regex.test(lower))) {
      return guide.displayName
    }
  }
  return undefined
}

function inferTargetRoleFromKeywords(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const entry of KEYWORD_ROLE_MAP) {
    if (entry.keywords.some((regex) => regex.test(lower))) {
      return entry.label
    }
  }
  return undefined
}

function resolveRoleGuide(role?: string): { key: string; guide: RoleGuide } | null {
  if (!role) return null
  const guide = ROLE_GUIDE_LIST.find((item) => {
    const lower = role.toLowerCase()
    return item.aliases.some((regex) => regex.test(lower)) || lower.includes(item.displayName.toLowerCase())
  })
  if (!guide) return null
  return { key: guide.key, guide }
}

function deriveIndustryPersona(message: string, profile: Profile | null | undefined, resume: ResumeSnapshot | null): {
  personaName: string
  personaContext: string
} {
  const sources = [message, profile?.goals || '', profile?.major || '', profile?.educationLevel || '', resume?.alignmentCareers?.map((c) => c.title).join(' ') || '', (resume?.skillsIdentified || []).join(' ')]
  const combined = sources.filter(Boolean).join(' ').toLowerCase()

  for (const entry of INDUSTRY_KEYWORDS) {
    if (entry.keywords.some((regex) => regex.test(combined))) {
      return { personaName: entry.persona, personaContext: entry.context }
    }
  }

  return {
    personaName: 'Strategic Career Advisor',
    personaContext: 'You balance data-driven analysis with mentorship across industries, highlighting market realities, skill-building, and networking moves.',
  }
}

function extractRememberedFacts(profile: Profile | null | undefined, resume: ResumeSnapshot | null, history: HistoryMessage[]): string[] {
  const facts: string[] = []
  if (profile?.educationLevel) {
    facts.push(`Education: ${profile.educationLevel}${profile.major ? ` in ${profile.major}` : ''}`)
  }
  if (profile?.goals) {
    facts.push(`Goal stated earlier: ${profile.goals}`)
  }
  const profileSkills = safeParseArray<string>(profile?.skills).slice(0, 5)
  if (profileSkills.length) {
    facts.push(`Skills on record: ${profileSkills.join(', ')}`)
  }
  if (resume?.skillsIdentified.length) {
    facts.push(`Resume highlights skills: ${resume.skillsIdentified.slice(0, 5).join(', ')}`)
  }
  if (resume?.strengths.length) {
    facts.push(`Resume strengths: ${resume.strengths.slice(0, 2).join('; ')}`)
  }

  const historyFacts = history
    .filter((item) => item.role === 'user')
    .map((item) => item.content)
    .join(' ')
    .toLowerCase()

  if (historyFacts.includes('intern') || historyFacts.includes('entry level')) {
    facts.push('User previously mentioned being early-career / internship stage.')
  }
  if (historyFacts.includes('remote')) {
    facts.push('User expressed interest in remote roles.')
  }
  if (historyFacts.includes('philippines') || historyFacts.includes('ph ')) {
    facts.push('User is tracking opportunities in the Philippines.')
  }

  return Array.from(new Set(facts))
}

function buildMemorySummary(facts: string[]): string | undefined {
  if (!facts.length) return undefined
  return facts.join('; ')
}

function buildResumeSummary(resume?: ResumeSnapshot | null): string | undefined {
  if (!resume) return undefined
  const lines: string[] = []
  if (resume.overallScore !== undefined && resume.overallScore !== null) {
    lines.push(`Overall score: ${Math.round(resume.overallScore)}/100`)
  }
  if (resume.strengths.length) {
    lines.push(`Strengths: ${resume.strengths.slice(0, 2).join('; ')}`)
  }
  if (resume.improvementSuggestions.length) {
    const suggestions = resume.improvementSuggestions
      .slice(0, 2)
      .map((item) => (item.area ? `${item.area}: ${item.suggestion}` : item.suggestion))
      .join('; ')
    lines.push(`Improvements: ${suggestions}`)
  }
  if (resume.skillsIdentified.length) {
    lines.push(`Skills seen: ${resume.skillsIdentified.slice(0, 4).join(', ')}`)
  }
  if (resume.alignmentCareers.length) {
    const best = resume.alignmentCareers[0]
    lines.push(`Career alignment: ${best.title}${best.matchScore ? ` (${Math.round(best.matchScore)}%)` : ''}`)
  }
  return lines.join('\n')
}

export function summariseConversationHistory(history: HistoryMessage[] = []): string {
  const userMessages = history.filter((item) => item.role === 'user').map((item) => item.content.trim()).filter(Boolean)
  if (!userMessages.length) return ''
  return userMessages
    .slice(-3)
    .map((text, index) => `${index + 1}. ${text}`)
    .join('\n')
}

export function parseResumeSnapshot(record: {
  fileName?: string | null
  analysisResult?: string | null
  improvementSuggestions?: string | null
  overallScore?: number | null
  createdAt?: Date | string | null
} | null): ResumeSnapshot | null {
  if (!record) return null
  let parsed: any = null
  if (record.analysisResult) {
    try {
      parsed = JSON.parse(record.analysisResult)
    } catch {
      parsed = null
    }
  }
  const suggestionsFromRecord = safeParseArray<ResumeSuggestion>(record.improvementSuggestions)
  const suggestionsFromAnalysis = safeParseArray<ResumeSuggestion>(parsed?.improvementSuggestions)
  const improvementSuggestions = [...suggestionsFromAnalysis, ...suggestionsFromRecord].filter(
    (item) => typeof item === 'object' && item && (item as ResumeSuggestion).suggestion
  ) as ResumeSuggestion[]

  return {
    fileName: record.fileName ?? undefined,
    uploadedAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : typeof record.createdAt === 'string'
        ? record.createdAt
        : undefined,
    overallScore: parsed?.overallScore ?? record.overallScore ?? null,
    strengths: safeParseArray<string>(parsed?.strengths),
    weaknesses: safeParseArray<string>(parsed?.weaknesses),
    improvementSuggestions,
    skillsIdentified: safeParseArray<string>(parsed?.skillsIdentified),
    alignmentCareers: safeParseArray<{ title: string; matchScore?: number }>(parsed?.careerAlignment?.careers),
  }
}

export function deriveCoachingContext(input: CoachingContextInput): CoachingContext {
  // Collect profile and resume signals so we can surface the user’s existing strengths.
  const profileSkills = safeParseArray<string>(input.profile?.skills || [])
    .map((skill) => skill.trim())
    .filter(Boolean)
  const resumeSkills = (input.resume?.skillsIdentified ?? []).map((skill) => skill.trim()).filter(Boolean)
  const historyMessages = input.history ?? []
  const userHistory = historyMessages.filter((item) => item.role === 'user').map((item) => item.content)

  const messageTargetRaw =
    extractMatch(input.message, TARGET_ROLE_PATTERNS) ||
    extractMatch(input.message, DIRECT_TARGET_PATTERNS) ||
    guessRoleByAliases(input.message) ||
    inferTargetRoleFromKeywords(input.message)
  const historyTargetRaw =
    userHistory
      .slice(-5)
      .map((text) =>
        extractMatch(text, TARGET_ROLE_PATTERNS) ||
        extractMatch(text, DIRECT_TARGET_PATTERNS) ||
        guessRoleByAliases(text) ||
        inferTargetRoleFromKeywords(text)
      )
      .find((value) => Boolean(value)) || undefined
  const resumeTargetRaw = input.resume?.alignmentCareers?.[0]?.title

  const targetRoleRaw = messageTargetRaw || historyTargetRaw || resumeTargetRaw
  const normalizedTarget = targetRoleRaw ? normaliseRole(targetRoleRaw) : undefined
  const resolvedGuide = resolveRoleGuide(normalizedTarget || targetRoleRaw)
  const targetDisplay = resolvedGuide?.guide.displayName || toDisplayRole(normalizedTarget) || targetRoleRaw

  const currentRoleRaw =
    extractMatch(input.message, CURRENT_ROLE_PATTERNS) ||
    userHistory
      .slice(-5)
      .map((text) => extractMatch(text, CURRENT_ROLE_PATTERNS))
      .find((value) => Boolean(value))
  const normalizedCurrent = currentRoleRaw ? normaliseRole(currentRoleRaw) : undefined
  const currentDisplay = normalizedCurrent ? toDisplayRole(normalizedCurrent) : toDisplayRole(currentRoleRaw)

  const conversationSummary = summariseConversationHistory(historyMessages)
  const resumeSummary = buildResumeSummary(input.resume)
  const rememberedFacts = extractRememberedFacts(input.profile ?? null, input.resume ?? null, historyMessages)
  const memorySummary = buildMemorySummary(rememberedFacts)

  const persona = deriveIndustryPersona(input.message, input.profile ?? null, input.resume ?? null)

  const missingDetails: string[] = []
  if (!targetDisplay) {
    missingDetails.push('target role')
  }
  if (!resumeSummary && input.intent === 'resume') {
    missingDetails.push('latest resume upload or summary of experience')
  }

  const marketSnapshot = describeMarketSnapshot(targetDisplay || normalizedTarget || null)
  const recommendedProjects = listRecommendedProjects(targetDisplay || normalizedTarget || null)

  const pivotDetected =
    Boolean(normalizedCurrent) &&
    Boolean(normalizedTarget) &&
    normalizedCurrent !== normalizedTarget &&
    normalizedTarget !== undefined

  return {
    message: input.message,
    intent: input.intent,
    stage: input.stage,
    targetRole: normalizedTarget || (targetDisplay ? targetDisplay.toLowerCase() : undefined),
    targetDisplay: targetDisplay || undefined,
    targetGuideKey: resolvedGuide?.key,
    targetSource: messageTargetRaw ? 'message' : historyTargetRaw ? 'history' : resumeTargetRaw ? 'resume' : undefined,
    currentRole: normalizedCurrent || (currentDisplay ? currentDisplay.toLowerCase() : undefined),
    currentDisplay: currentDisplay || undefined,
    resume: input.resume ?? null,
    profileSkills,
    resumeSkills,
    conversationSummary: conversationSummary || undefined,
    resumeSummary,
    recentUserMessages: userHistory.slice(-3),
    missingDetails,
    pivotDetected,
    personaName: persona.personaName,
    personaContext: persona.personaContext,
    memorySummary,
    rememberedFacts,
    marketSnapshot,
    recommendedProjects,
    interestKey: input.interestKey ?? null,
    interestLabel: input.interestLabel ?? null,
    recommendedCareers: input.recommendedCareers ?? [],
  }
}

function formatAdvisorCoachMessage(headline: string, insights: string[], nextSteps: string[], question: string): string {
  const parts: string[] = [`**${headline}**`]
  if (insights.length) {
    parts.push('**Key Insights**', ...insights.map((item) => `- ${item}`))
  }
  if (nextSteps.length) {
    parts.push('**Next Steps**', ...nextSteps.map((step) => `✅ ${step}`))
  }
  const trimmedQuestion = question.trim()
  parts.push(trimmedQuestion.endsWith('?') ? trimmedQuestion : `${trimmedQuestion}?`)
  return parts.join('\n\n')
}

function clarificationPlan(context: CoachingContext): string {
  const interest = context.interestLabel ? context.interestLabel : 'career direction'
  const headline = `Clarify Your ${interest.toUpperCase()} Focus`
  const insights = [
    'Choose a focus role → Without a target the plan stays generic → Shortlist web developer, UX designer, and data analyst before picking.',
    'Surface wins you enjoyed → Helps me map strengths to hiring demand → Share two projects or classes that made you proud.',
    'Define your work setup → Guides which PH companies we pursue → Decide if remote, hybrid, or on-site fits your life right now.',
  ]
  const nextSteps = [
    'List two skills or subjects that energise you today.',
    'Write down three industries or companies you admire in the Philippines.',
    'Block 15 minutes to journal what kind of project keeps you motivated.',
  ]
  const question = 'Which role feels worth testing first so I can map precise next steps for you'
  return formatAdvisorCoachMessage(headline, insights, nextSteps, question)
}

function targetedPlan(context: CoachingContext): string {
  const roleName = context.targetDisplay || toDisplayRole(context.targetRole ?? '') || 'Target Role'
  const fit = computeFitScore(context)
  const fitReason = fit.reason.replace(/; /g, ', ')
  const strengthExample = context.resume?.strengths?.[0]
    ? `Lead your resume with “${context.resume.strengths[0]}”.`
    : 'Turn your strongest project into a two-line case study with a metric.'
  const marketInsight = context.marketSnapshot || getMarketSnapshot(roleName)
  const projectExample = context.recommendedProjects?.[0]
    ? `Ship “${context.recommendedProjects[0]}” and capture the metric it improves.`
    : 'Ship a weekend build that solves a local client or community issue.'

  const insights: string[] = [
    `${roleName} trajectory → Fit score ${fit.score}/10 shows ${fitReason} → ${strengthExample}`,
    `${roleName} market pulse → ${marketInsight} → Save three Kalibrr listings that match this range today.`,
    `Proof of impact → Hiring teams prioritise measurable wins and learning agility → ${projectExample}`,
  ]

  const nextSteps: string[] = []
  if (context.recommendedProjects?.length) {
    nextSteps.push(`Schedule time this week to complete “${context.recommendedProjects[0]}” and note one metric it moves.`)
  } else {
    nextSteps.push('Choose one mini-project that mirrors the role and block four focused hours to ship it.')
  }

  const resumeSkills = context.resumeSkills.length ? context.resumeSkills.slice(0, 2).join(' & ') : null
  if (resumeSkills) {
    nextSteps.push(`Rewrite one resume bullet to highlight ${resumeSkills} with problem → action → result.`)
  } else {
    nextSteps.push('Rewrite one resume bullet with problem → action → metric tailored to this role.')
  }

  nextSteps.push(`Reach out to one ${roleName} in your network for a 10-minute check-in on current hiring priorities.`)

  const question = `Which project or metric should we polish next so I can help you showcase it for ${roleName}?`
  return formatAdvisorCoachMessage(`Your ${roleName} Strategy`, insights, nextSteps, question)
}

export function buildPersonalizedCoachPlan(context: CoachingContext): string {
  if (!context.targetDisplay) {
    return clarificationPlan(context)
  }
  return targetedPlan(context)
}

function roleKeywordsForContext(context: CoachingContext): string[] {
  const keywords: string[] = []
  if (context.targetDisplay) {
    keywords.push(context.targetDisplay.toLowerCase())
  }
  if (context.targetRole) {
    keywords.push(context.targetRole.toLowerCase())
  }
  if (context.targetGuideKey) {
    const guide = ROLE_GUIDES[context.targetGuideKey]
    if (guide) {
      guide.aliases.forEach((regex) => {
        const source = regex.source.replace(/[\\^$]/g, '')
        keywords.push(source.toLowerCase())
      })
    }
  }
  return Array.from(new Set(keywords.filter(Boolean)))
}

export function enforceContextualRelevance(output: string | null | undefined, context: CoachingContext): string | null {
  if (!output) return null
  const trimmed = output.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()

  if (context.targetDisplay) {
    const keywords = roleKeywordsForContext(context)
    if (!keywords.some((keyword) => lower.includes(keyword.replace(/\\W+/g, ' ').trim()))) {
      return null
    }
  }

  if (context.intent === 'resume' && !/resume|curriculum vitae|cv/i.test(lower)) {
    return null
  }

  if (context.intent === 'interview' && !/interview|question/i.test(lower)) {
    return null
  }

  return trimmed
}

function computeFitScore(context: CoachingContext): { line: string; score: number; role: string; reason: string } {
  const role = context.targetDisplay || 'web developer'
  let score = 5
  if (context.profileSkills.length || context.resumeSkills.length) score += 1
  if (context.profileSkills.some((s) => /react|java|sql|design|nurse|marketing/i.test(s))) score += 1
  if (context.resume?.strengths.length) score += 1
  if (context.intent === 'skills' || context.intent === 'resume') score += 0.5
  score = Math.min(9, Math.round(score * 10) / 10)

  const reasons: string[] = []
  if (context.profileSkills.length || context.resumeSkills.length) {
    reasons.push('existing stack already useful')
  }
  if (context.resume?.strengths.length) {
    reasons.push('you’ve shown impact before')
  }
  let gap = ''
  if (!context.resume?.strengths.length) {
    gap = '—prove impact with one quantified project update'
  } else if (!context.resumeSkills.length && !context.profileSkills.length) {
    gap = '—get one skills-focused project into your portfolio'
  }
  const line = `Fit Score: ${score}/10 for ${role}${gap}`
  const reason = reasons.length ? reasons.join('; ') : 'foundation is there but proof of impact still light'
  return { line, score, role, reason }
}

function suggestAlternateRole(primaryRole: string): string | undefined {
  const lower = primaryRole.toLowerCase()
  if (lower.includes('web') || lower.includes('software')) return 'UI/UX Designer'
  if (lower.includes('data')) return 'Business Intelligence Analyst'
  if (lower.includes('designer')) return 'Front-end Developer'
  if (lower.includes('marketing')) return 'Product Manager'
  if (lower.includes('nurse')) return 'Healthcare Operations Manager'
  return undefined
}

function getMarketSnapshot(role: string): string {
  const lower = role.toLowerCase()
  if (lower.includes('web') || lower.includes('software')) {
    return 'PH postings for Next.js devs sit around ₱45k–₱70k/month right now.'
  }
  if (lower.includes('data')) {
    return 'PH data analyst roles range ₱38k–₱60k/month depending on SQL + dashboard depth.'
  }
  if (lower.includes('designer')) {
    return 'Product designers with solid case studies land ₱40k–₱65k/month in Metro Manila.'
  }
  if (lower.includes('customer')) {
    return 'BPO team leads with QA metrics hit ₱35k–₱50k/month plus incentives.'
  }
  if (lower.includes('healthcare')) {
    return 'Hospital admin roles in NCR hover around ₱50k/month when you show operations wins.'
  }
  return 'PH employers back candidates who pair measurable wins with collaboration proof—tailor your story that way.'
}

