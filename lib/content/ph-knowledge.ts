/**
 * Philippines Labour Market Knowledge Base
 * Centralised, structured data that keeps prompts and UI grounded in local reality.
 */

export interface RoleInsight {
  role: string
  displayName: string
  salaryBand: string
  hiringHotspots: string[]
  topEmployers: string[]
  interviewFocus: string[]
  recommendedProjects: string[]
  learningTracks: Array<{ title: string; url: string }>
}

export interface ResourceItem {
  id: string
  title: string
  description: string
  url: string
  category: 'community' | 'event' | 'course' | 'toolkit'
  locale: 'ph' | 'global'
  roles?: string[]
  stages?: Array<'college_student' | 'graduating_student' | 'career_planner'>
}

const ROLE_INSIGHTS: RoleInsight[] = [
  {
    role: 'software engineer',
    displayName: 'Software Engineer',
    salaryBand: '₱45k – ₱90k / month for junior-to-mid roles; remote startups can reach ₱120k+ with USD peg.',
    hiringHotspots: ['Metro Manila (BGC, Ortigas, Makati)', 'Cebu IT Park', 'Clark Global City'],
    topEmployers: ['PayMongo', 'Kumu', 'Sprout Solutions', 'Accenture Technology', 'Globant PH'],
    interviewFocus: [
      'Practical coding rounds (arrays, API design, system design basics)',
      'Team-fit conversations about asynchronous collaboration and agile rituals',
      'Scenario questions on debugging, observability, and production ownership',
    ],
    recommendedProjects: [
      'Ship a production-ready Next.js or NestJS app deployed on Vercel / Render with monitoring.',
      'Instrument one project with logging + simple analytics to prove observability discipline.',
      'Publish a technical write-up that breaks down a feature from problem to shipped outcome.',
    ],
    learningTracks: [
      { title: 'DICT Emerging Tech Scholarship', url: 'https://dict.gov.ph' },
      { title: 'StackTrek Academy', url: 'https://stacktrek.com' },
      { title: 'Zuitt Full-Stack Bootcamp', url: 'https://zuitt.co' },
    ],
  },
  {
    role: 'data analyst',
    displayName: 'Data Analyst',
    salaryBand: '₱35k – ₱70k / month; fintech and BPO analytics pods often provide equity or shift premiums.',
    hiringHotspots: ['Ortigas data hubs', 'Makati CBD', 'BGC analytics teams', 'Remote ASEAN startups'],
    topEmployers: ['GCash', 'Maya', 'NielsenIQ', 'Shopee PH', 'Grab Shared Services'],
    interviewFocus: [
      'SQL joins, window functions, and data cleaning conversations using PH business datasets',
      'Storytelling using metrics that matter (retention, GMV, acquisition)',
      'Stakeholder alignment and experimentation mindset (A/B tests, cohort reviews)',
    ],
    recommendedProjects: [
      'Analyse PSA or DOTr public data and publish a cleaned dashboard with recommendations.',
      'Reverse-engineer growth metrics of a local app, highlighting retention levers.',
      'Deliver a slide deck that converts raw data to an executive decision recommendation.',
    ],
    learningTracks: [
      { title: 'Ateneo Analytics Association events', url: 'https://www.facebook.com/aap.analytics/' },
      { title: 'Google Career Certificate: Data Analytics', url: 'https://grow.google/certificates' },
      { title: 'StackLeague Data Science League', url: 'https://stackleague.com' },
    ],
  },
  {
    role: 'ux designer',
    displayName: 'UX / Product Designer',
    salaryBand: '₱40k – ₱75k / month; product-led startups offer stock options and remote-flex packages.',
    hiringHotspots: ['Product teams in BGC', 'Hybrid roles in Makati/Ortigas', 'Fully-remote SEA companies'],
    topEmployers: ['FWD Insurance Experience Lab', 'First Circle', 'Kalibrr', 'Coins.ph', 'Thinking Machines'],
    interviewFocus: [
      'Case review: framing problem statements and measuring UX outcomes',
      'Collaboration stories with engineering, product, and marketing squads',
      'Design systems literacy (Figma variants, accessibility, responsive behaviour)',
    ],
    recommendedProjects: [
      'Produce a case study for a local service redesign (e.g., government portal, fintech onboarding).',
      'Document usability testing sessions and show insight synthesis.',
      'Build a responsive design system with tokens, typography, and component variants.',
    ],
    learningTracks: [
      { title: 'UXPH Mentorship Circles', url: 'https://www.uxph.org' },
      { title: 'Interaction Design Foundation Philippines', url: 'https://www.interaction-design.org/local-groups/philippines' },
      { title: 'Kalibrr Product Design Community', url: 'https://www.facebook.com/groups/kalibrrdesign/' },
    ],
  },
  {
    role: 'product manager',
    displayName: 'Product Manager',
    salaryBand: '₱55k – ₱110k / month depending on ownership scope; SEA remote roles can reach US-level pay.',
    hiringHotspots: ['Scale-ups in BGC and Makati', 'Enterprise innovation labs', 'SEA remote-first startups'],
    topEmployers: ['Voyager Innovations (Maya)', 'Asticom PSG', 'Shopee Regional PMO', 'Sprout Solutions', 'Lazada'],
    interviewFocus: [
      'Product discovery, user research, and defining north-star metrics for PH users',
      'Prioritisation frameworks (RICE, MoSCoW) and roadmap storytelling',
      'Cross-functional leadership and incident retrospectives',
    ],
    recommendedProjects: [
      'Write a PRD for a locally relevant feature (e.g., GCash SME wallet upgrade).',
      'Run a lightweight experiment (survey or landing page) and document results.',
      'Create a stakeholder comms plan for a staged feature rollout.',
    ],
    learningTracks: [
      { title: 'Product Camp Manila', url: 'https://www.facebook.com/ProductCampManila/' },
      { title: 'UX+ University Product Strategy', url: 'https://uxpl.us/university' },
      { title: 'Reforge Free Essays & Summaries', url: 'https://www.reforge.com/blog' },
    ],
  },
  {
    role: 'cybersecurity analyst',
    displayName: 'Cybersecurity Analyst',
    salaryBand: '₱45k – ₱85k / month; SOC night-shift differentials and certification bonuses apply.',
    hiringHotspots: ['Makati/BGC SOCs', 'Pampanga/Clark cyber parks', 'Remote managed security providers'],
    topEmployers: ['Trend Micro PH', 'SecureWorks Manila', 'Yondu', 'DFNN', 'GCash SecOps'],
    interviewFocus: [
      'Incident response scenarios referencing MITRE ATT&CK',
      'Tooling proficiency (SIEM, IDS/IPS, vulnerability scanners)',
      'Compliance and governance knowledge (ISO 27001, PDPA)',
    ],
    recommendedProjects: [
      'Build a mini home lab with Security Onion or Wazuh and document detections.',
      'Write a post-incident report using a real case study (scrub sensitive details).',
      'Complete TryHackMe rooms and publish key learnings on LinkedIn.',
    ],
    learningTracks: [
      { title: 'PH-CERT Advisories', url: 'https://www.facebook.com/PHCERT/' },
      { title: 'DICT Cybersecurity Skills Programme', url: 'https://dict.gov.ph' },
      { title: 'RangeForce / TryHackMe Labs', url: 'https://tryhackme.com' },
    ],
  },
  {
    role: 'customer service specialist',
    displayName: 'Customer Service / BPO Specialist',
    salaryBand: '₱22k – ₱45k / month with night-shift pay; premium accounts provide performance incentives.',
    hiringHotspots: ['Quezon City', 'Ortigas', 'Iloilo Business Park', 'Bacolod IT Park'],
    topEmployers: ['TaskUs', 'Concentrix', 'Telus International', 'Alorica', 'TTEC'],
    interviewFocus: [
      'Scenario handling for irate customers and escalation policies',
      'Tools familiarity (Zendesk, Salesforce, Freshdesk)',
      'Voice quality, empathy, and metrics understanding (CSAT, AHT, QA scores)',
    ],
    recommendedProjects: [
      'Record mock calls and self-score using QA rubrics.',
      'Draft SOP playbooks for recurring customer issues.',
      'Create a mini knowledge base for a fictional PH SME product.',
    ],
    learningTracks: [
      { title: 'TESDA Contact Center NC II', url: 'https://tesda.gov.ph' },
      { title: 'TaskUs CX Webinars', url: 'https://www.taskus.com/webinars/' },
      { title: 'Kalibrr CX Community', url: 'https://www.kalibrr.com' },
    ],
  },
]

const RESOURCE_LIBRARY: ResourceItem[] = [
  {
    id: 'resource-uxph-bootcamp',
    title: 'UXPH Mentorship Circles',
    description: 'Peer critique sessions and design reviews focused on PH product experiences.',
    url: 'https://www.uxph.org',
    category: 'community',
    locale: 'ph',
    roles: ['ux designer', 'product manager'],
    stages: ['graduating_student', 'career_planner'],
  },
  {
    id: 'resource-product-camp-manila',
    title: 'Product Camp Manila',
    description: 'Quarterly unconference for budding and senior PMs in the Philippines.',
    url: 'https://www.facebook.com/ProductCampManila/',
    category: 'event',
    locale: 'ph',
    roles: ['product manager', 'software engineer'],
    stages: ['career_planner'],
  },
  {
    id: 'resource-dict-emerging-tech',
    title: 'DICT Emerging Tech Scholarship',
    description: 'Government-backed scholarship covering cloud, cybersecurity, and data courses.',
    url: 'https://dict.gov.ph',
    category: 'course',
    locale: 'ph',
    roles: ['software engineer', 'cybersecurity analyst', 'data analyst'],
    stages: ['college_student', 'graduating_student', 'career_planner'],
  },
  {
    id: 'resource-analytics-association',
    title: 'Analytics Association of the Philippines',
    description: 'Community events and mentorship for analytics professionals.',
    url: 'https://www.facebook.com/aap.analytics/',
    category: 'community',
    locale: 'ph',
    roles: ['data analyst', 'product manager'],
    stages: ['graduating_student', 'career_planner'],
  },
  {
    id: 'resource-stackleague',
    title: 'StackLeague Data Science League',
    description: 'Gamified analytics competitions with PH-specific business cases.',
    url: 'https://stackleague.com',
    category: 'event',
    locale: 'ph',
    roles: ['data analyst', 'software engineer'],
    stages: ['college_student', 'graduating_student'],
  },
  {
    id: 'resource-tryhackme',
    title: 'TryHackMe Guided Labs',
    description: 'Hands-on cybersecurity labs with defensive and offensive tracks.',
    url: 'https://tryhackme.com',
    category: 'course',
    locale: 'global',
    roles: ['cybersecurity analyst'],
    stages: ['graduating_student', 'career_planner'],
  },
  {
    id: 'resource-taskus-webinars',
    title: 'TaskUs CX Webinars',
    description: 'Monthly sessions covering BPO customer experience trends and QA.',
    url: 'https://www.taskus.com/webinars/',
    category: 'event',
    locale: 'ph',
    roles: ['customer service specialist'],
    stages: ['college_student', 'graduating_student'],
  },
  {
    id: 'resource-stacktrek',
    title: 'StackTrek Bootcamp',
    description: 'Project-based software engineering bootcamp with PH job placement partners.',
    url: 'https://stacktrek.com',
    category: 'course',
    locale: 'ph',
    roles: ['software engineer'],
    stages: ['college_student', 'graduating_student'],
  },
]

function normalise(value: string | null | undefined): string | null {
  if (!value) return null
  return value.toLowerCase().trim()
}

export function getRoleInsight(role: string | null | undefined): RoleInsight | null {
  const target = normalise(role)
  if (!target) return null
  return ROLE_INSIGHTS.find((insight) => {
    if (insight.role === target) return true
    const normalizedDisplay = insight.displayName.toLowerCase()
    if (normalizedDisplay === target) return true
    if (target.includes(insight.role)) return true
    if (target.includes(normalizedDisplay)) return true
    // allow partial matches like "web dev" to map to web developer
    return normalizedDisplay.split(' ').every((word) => target.includes(word))
  }) || null
}

export function getLocalizedResources({
  role,
  stage,
  limit = 6,
}: {
  role?: string | null
  stage?: string | null
  limit?: number
}): ResourceItem[] {
  const roleKey = normalise(role)
  const stageKey = normalise(stage)

  const filtered = RESOURCE_LIBRARY.filter((resource) => {
    if (resource.locale !== 'ph') return false
    const roleMatch = !roleKey || !resource.roles?.length || resource.roles?.some((r) => r === roleKey)
    const stageMatch = !stageKey || !resource.stages?.length || resource.stages.includes(stageKey as any)
    return roleMatch && stageMatch
  })

  return filtered.slice(0, limit)
}

export function describeMarketSnapshot(role: string | null | undefined): string | null {
  const insight = getRoleInsight(role)
  if (!insight) return null

  return [
    `**PH Salary Band:** ${insight.salaryBand}`,
    `**Hiring Hotspots:** ${insight.hiringHotspots.join(', ')}`,
    `**Teams hiring now:** ${insight.topEmployers.join(', ')}`,
    `**Interview focus:** ${insight.interviewFocus[0]}`,
  ].join('\n')
}

export function listRecommendedProjects(role: string | null | undefined): string[] {
  const insight = getRoleInsight(role)
  return insight?.recommendedProjects ?? []
}

export function listLearningTracks(role: string | null | undefined): Array<{ title: string; url: string }> {
  const insight = getRoleInsight(role)
  return insight?.learningTracks ?? []
}

export function listRoleInsights(): RoleInsight[] {
  return ROLE_INSIGHTS.map((insight) => ({
    ...insight,
    hiringHotspots: [...insight.hiringHotspots],
    topEmployers: [...insight.topEmployers],
    interviewFocus: [...insight.interviewFocus],
    recommendedProjects: [...insight.recommendedProjects],
    learningTracks: insight.learningTracks.map((track) => ({ ...track })),
  }))
}

