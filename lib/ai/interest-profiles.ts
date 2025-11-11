export interface InterestProfile {
  key: string
  label: string
  keywords: RegExp[]
  careers: string[]
}

const INTEREST_PROFILES: InterestProfile[] = [
  {
    key: 'software',
    label: 'coding and building software',
    keywords: [/coding/i, /programming/i, /developer/i, /software/i, /frontend/i, /back[-\s]?end/i, /full[-\s]?stack/i],
    careers: ['Front-End Web Developer', 'Full-Stack Developer', 'Software Engineer', 'QA Engineer'],
  },
  {
    key: 'data',
    label: 'making sense of data',
    keywords: [/data/i, /analytics?/i, /business intelligence/i, /sql/i, /python/i, /power bi/i],
    careers: ['Data Analyst', 'Business Intelligence Analyst', 'Data Engineer'],
  },
  {
    key: 'design',
    label: 'designing great experiences',
    keywords: [/design/i, /ux/i, /ui/i, /product design/i, /figma/i, /wireframe/i],
    careers: ['UX/UI Designer', 'Product Designer', 'UX Researcher'],
  },
  {
    key: 'cybersecurity',
    label: 'protecting systems and data',
    keywords: [/cyber/i, /security/i, /infosec/i, /penetration testing/i, /\bSOC\b/i],
    careers: ['Cybersecurity Analyst', 'Security Operations Center Analyst', 'Vulnerability Analyst'],
  },
  {
    key: 'customer_experience',
    label: 'supporting customers in tech',
    keywords: [/customer service/i, /bpo/i, /call center/i, /\bcsr\b/i, /support/i],
    careers: ['Customer Support Specialist', 'Customer Success Associate', 'Service Desk Analyst'],
  },
  {
    key: 'project_lead',
    label: 'leading projects and teams',
    keywords: [/project/i, /\bpmo\b/i, /scrum/i, /agile/i, /product manager/i],
    careers: ['Product Manager', 'Project Coordinator', 'Scrum Master'],
  },
]

export function detectInterestProfile(message: string): InterestProfile | null {
  const lower = message.toLowerCase()
  for (const profile of INTEREST_PROFILES) {
    if (profile.keywords.some((regex) => regex.test(lower))) {
      return profile
    }
  }
  return null
}

export function mapInterestToCareers(interestKey?: string | null): string[] {
  if (!interestKey) return []
  const profile = INTEREST_PROFILES.find((item) => item.key === interestKey)
  return profile ? profile.careers : []
}

export function describeInterest(interestKey?: string | null): string | null {
  if (!interestKey) return null
  const profile = INTEREST_PROFILES.find((item) => item.key === interestKey)
  return profile ? profile.label : null
}



