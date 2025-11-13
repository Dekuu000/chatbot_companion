/**
 * Resume Service
 * Handles resume analysis and improvements
 */

import { Resume } from '@prisma/client'
import { PERPLEXITY_DEFAULT_MODEL, callAIWithFallback } from '@/lib/openai'

export interface ResumeAnalysisResult {
  overallScore: number
  careerAlignment?: {
    matchScore?: number
    careers?: Array<{ title: string; matchScore: number }>
  }
  improvementSuggestions?: Array<{
    area: string
    suggestion: string
    priority: 'high' | 'medium' | 'low'
  }>
  strengths?: string[]
  weaknesses?: string[]
  skillsIdentified?: string[]
}

interface AnalyseOptions {
  profileContext: string
  targetRole?: string | null
  userStage?: string | null
  intent?: string | null
  timeoutMs?: number
  enableFallback?: boolean
}

const DEFAULT_TIMEOUT = 45_000

/**
 * Validates and normalizes AI analysis response structure
 * Ensures all required fields are present with proper defaults
 */
function validateAndNormalizeAnalysis(parsed: any): ResumeAnalysisResult {
  // Ensure overallScore is a number
  const overallScore = typeof parsed.overallScore === 'number' 
    ? Math.max(0, Math.min(100, parsed.overallScore))
    : 75

  // Ensure careerAlignment structure
  const careerAlignment = parsed.careerAlignment || {}
  const careers = Array.isArray(careerAlignment.careers) 
    ? careerAlignment.careers.filter((c: any) => c && c.title && typeof c.matchScore === 'number')
    : []

  // Ensure improvementSuggestions structure
  const improvementSuggestions = Array.isArray(parsed.improvementSuggestions)
    ? parsed.improvementSuggestions.filter((s: any) => s && s.area && s.suggestion)
    : []

  // Ensure strengths array
  const strengths = Array.isArray(parsed.strengths)
    ? parsed.strengths.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
    : []

  // Ensure weaknesses array
  const weaknesses = Array.isArray(parsed.weaknesses)
    ? parsed.weaknesses.filter((w: any) => typeof w === 'string' && w.trim().length > 0)
    : []

  // Ensure skillsIdentified array
  const skillsIdentified = Array.isArray(parsed.skillsIdentified)
    ? parsed.skillsIdentified.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
    : []

  console.log('Validated analysis structure:', {
    overallScore,
    careersCount: careers.length,
    improvementsCount: improvementSuggestions.length,
    strengthsCount: strengths.length,
    weaknessesCount: weaknesses.length,
    skillsCount: skillsIdentified.length,
  })

  return {
    overallScore,
    careerAlignment: {
      matchScore: typeof careerAlignment.matchScore === 'number' ? careerAlignment.matchScore : (careers.length > 0 ? Math.round(careers.reduce((sum: number, c: any) => sum + c.matchScore, 0) / careers.length) : 60),
      careers: careers.slice(0, 5), // Limit to top 5 careers
    },
    improvementSuggestions: improvementSuggestions.slice(0, 10), // Limit to top 10 suggestions
    strengths: strengths.slice(0, 10), // Limit to top 10 strengths
    weaknesses: weaknesses.slice(0, 10), // Limit to top 10 weaknesses
    skillsIdentified: skillsIdentified.slice(0, 20), // Limit to top 20 skills
  }
}

export async function analyzeResumeWithAI(
  resume: Pick<Resume, 'extractedText'>,
  { profileContext, targetRole, userStage, intent, timeoutMs = DEFAULT_TIMEOUT, enableFallback = true }: AnalyseOptions
): Promise<ResumeAnalysisResult> {
  const resumeText = resume.extractedText || ''
  console.log('📄 Starting resume analysis:', {
    resumeTextLength: resumeText.length,
    hasProfileContext: !!profileContext,
    targetRole: targetRole || 'none',
    userStage: userStage || 'none',
    intent: intent || 'none',
    timeoutMs,
    enableFallback,
  })
  
  const effectiveTimeout =
    typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.round(timeoutMs) : DEFAULT_TIMEOUT

  let controller: AbortController | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null

  try {
    controller = new AbortController()
    timeout = setTimeout(() => controller?.abort(), effectiveTimeout)

    // Use fallback function: try Perplexity first, fallback to Gemini on error
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a professional resume reviewer and career counselor. Analyze resumes from ALL industries (IT/Tech, Business/Finance, Healthcare, Education, Marketing, Sales, Design, and more). Provide specific, actionable feedback based on the actual resume content. Extract ALL skills mentioned across all sections. Detect the industry/field and suggest specific job titles matching the candidate\'s skills and experience. Base all feedback on actual resume content, not generic templates. Respond with valid JSON only.',
      },
      {
        role: 'user' as const,
        content: `Analyse this resume thoroughly and provide detailed feedback:

Resume Text:
${resumeText.substring(0, 6000)}${resumeText.length > 6000 ? ' ...(truncated)' : ''}

${profileContext ? `Profile Context:\n${profileContext}\n\n` : ''}
${targetRole ? `Target Role: ${targetRole}\n` : ''}
${userStage ? `User Stage: ${userStage}\n` : ''}
${intent ? `Intent Focus: ${intent}\n` : ''}

CRITICAL INSTRUCTIONS:
1. SKILL EXTRACTION: Extract ALL skills mentioned in the resume from ALL sections:
   - Skills section (all types: technical, business, healthcare, education, marketing, sales, design, etc.)
   - Experience section (skills used in job descriptions)
   - Certificates section (certifications and their associated skills)
   - Education section (relevant coursework or skills)
   - Any other sections where skills are mentioned
   Include both hard skills (technical, industry-specific) and soft skills (Communication, Problem Solving, Teamwork, Leadership, etc.) if mentioned.
   Examples across industries:
   * IT/Tech: HTML, CSS, JavaScript, Python, React, Networking, System Administration
   * Business/Finance: Excel, Financial Analysis, Accounting, QuickBooks, SAP, Salesforce
   * Healthcare: Patient Care, Medical Terminology, HIPAA, EMR Systems
   * Education: Teaching, Curriculum Development, Instructional Design
   * Marketing: SEO, Social Media Marketing, Content Marketing, Google Analytics
   * Sales: CRM, Sales Techniques, Account Management, Lead Generation
   * Design: Graphic Design, UI/UX, Adobe Suite, Figma

2. CAREER SUGGESTIONS: Suggest SPECIFIC job titles/roles that match the candidate's actual skills and experience:
   - Detect the industry/field from the resume content (IT, Business, Healthcare, Education, Marketing, Sales, Design, etc.)
   - Suggest specific job titles relevant to that industry:
     * IT/Tech: "Frontend Developer", "Full Stack Developer", "IT Support Specialist", "Network Administrator", "Data Analyst", "Web Developer", "System Administrator", "IT Security Specialist", "Software Engineer", "DevOps Engineer"
     * Business/Finance: "Financial Analyst", "Accountant", "Business Analyst", "Operations Manager", "Project Manager", "Financial Advisor"
     * Healthcare: "Medical Assistant", "Healthcare Administrator", "Nurse", "Healthcare Coordinator", "Medical Records Specialist"
     * Education: "Teacher", "Curriculum Developer", "Instructional Designer", "Education Coordinator", "Training Specialist"
     * Marketing: "Digital Marketing Specialist", "Content Marketing Manager", "SEO Specialist", "Social Media Manager", "Marketing Coordinator"
     * Sales: "Sales Representative", "Account Executive", "Business Development Manager", "Sales Manager", "Account Manager"
     * Design: "Graphic Designer", "UI/UX Designer", "Web Designer", "Creative Director", "Visual Designer"
   - AVOID generic suggestions like "Career Development Planning" or "Skills Refresh Program"
   - Match scores should reflect actual skill/experience overlap between the resume and the suggested role (0-100)
   - Base suggestions on: skills, certifications, work experience, education, and industry alignment

3. STRENGTHS: Identify strengths based on ACTUAL resume content:
   - Reference specific skills, experiences, achievements, or qualifications mentioned in the resume
   - Examples across industries:
     * "Strong technical foundation with certifications in Data Analytics (IBM, Google) and Networking (Cisco CCNA)"
     * "Demonstrated sales success with consistent achievement of quarterly targets"
     * "Extensive healthcare experience with expertise in patient care and medical records management"
     * "Proven teaching experience with curriculum development and student engagement"
     * "Diverse marketing portfolio showcasing SEO, social media, and content marketing expertise"
   - AVOID generic statements that could apply to any resume
   - Be specific to the candidate's actual background

4. WEAKNESSES: Identify actual gaps or issues in the resume:
   - Missing quantified achievements/metrics (e.g., "Increased sales by X%", "Managed X patients", "Taught X students")
   - Skills mentioned but not demonstrated in experience sections
   - Gaps in experience timeline
   - Missing relevant certifications or qualifications for stated career goals
   - Weak formatting or organization issues
   - Lack of industry-specific keywords or terminology
   - AVOID generic weaknesses that don't apply to this specific resume

5. IMPROVEMENT SUGGESTIONS: Provide specific, actionable advice tied to actual resume content:
   - Reference specific sections or experiences that need improvement
   - Suggest concrete additions based on what's missing for the candidate's industry/field
   - Prioritize based on impact: high (critical missing elements), medium (important enhancements), low (nice-to-have improvements)
   - Industry-specific examples:
     * IT: "Add specific technologies and frameworks used in projects"
     * Sales: "Include sales metrics and revenue achievements"
     * Healthcare: "Highlight patient care outcomes and compliance certifications"
     * Education: "Showcase student outcomes and curriculum development results"

6. SCORING: Calculate overallScore (0-100) based on:
   - Completeness of information
   - Relevance and specificity of experience to stated career goals
   - Skill demonstration through work experience
   - Presence of quantified achievements and metrics
   - Professional formatting and organization
   - Industry-appropriate content and terminology
   - Alignment with stated career goals

Return a JSON object with:
- overallScore: number (0-100) - calculated based on resume quality
- careerAlignment: { matchScore: number, careers: Array<{ title: string, matchScore: number }> }
  * careers should be SPECIFIC job titles matching the resume and industry (e.g., "Frontend Developer", "Financial Analyst", "Medical Assistant", "Marketing Specialist")
  * matchScore for each career should reflect actual skill/experience overlap (0-100)
- improvementSuggestions: Array<{ area: string, suggestion: string, priority: "high" | "medium" | "low" }>
  * Each suggestion should reference specific resume content
  * area should be specific (e.g., "Experience Section", "Skills Section", "Achievements", "Certifications")
- strengths: string[]
  * Each strength should reference specific resume content
  * Avoid generic statements
- weaknesses: string[]
  * Each weakness should identify actual gaps or issues in THIS resume
  * Be specific about what's missing or could be improved
- skillsIdentified: string[]
  * Include ALL skills found across ALL sections of the resume
  * Include both hard skills and soft skills if mentioned
  * Be comprehensive and specific`,
      },
    ]

    // Create a promise that respects the abort signal
    console.log('🤖 Calling AI for resume analysis...')
    const fallbackPromise = callAIWithFallback(messages, {
      model: PERPLEXITY_DEFAULT_MODEL,
      temperature: 0.7,
      responseFormat: 'json_object',
    })

    const result = await Promise.race([
      fallbackPromise,
      new Promise<never>((_, reject) => {
        if (controller) {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request timeout'))
          })
        }
      }),
    ])

    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }

    // Log which provider was used (for debugging)
    if (result.provider === 'gemini') {
      console.log('Used Gemini fallback for resume analysis')
    }

    const content = result.content || '{}'
    console.log('Resume analysis AI response received, content length:', content.length)
    console.log('Response preview:', content.substring(0, 200))
    
    // Parse JSON with error handling
    try {
      const parsed = JSON.parse(content)
      console.log('JSON parsed successfully, validating structure...')
      
      // Validate and normalize response structure
      return validateAndNormalizeAnalysis(parsed)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Failed to parse content:', content.substring(0, 500))
      
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        try {
          console.log('Attempting to parse extracted JSON from markdown...')
          const extracted = JSON.parse(jsonMatch[1])
          return validateAndNormalizeAnalysis(extracted)
        } catch (extractError) {
          console.error('Failed to parse extracted JSON:', extractError)
        }
      }
      
      // If JSON parsing fails, throw error to trigger fallback
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }
  } catch (error) {
    if (timeout) {
      clearTimeout(timeout)
    }
    if (controller && controller.signal.aborted === false) {
      controller.abort()
    }
    if (enableFallback) {
      console.warn('❌ Primary resume analysis failed:', error)
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      } else {
        console.error('Non-Error object:', JSON.stringify(error, null, 2))
      }
      
      // Try AI-generated fallback with simpler prompt
      try {
        console.log('🔄 Attempting simple AI fallback analysis...')
        return await attemptSimpleAIAnalysis(resumeText, profileContext, targetRole)
      } catch (fallbackError) {
        console.error('❌ Simple AI fallback also failed:', fallbackError)
        if (fallbackError instanceof Error) {
          console.error('Fallback error name:', fallbackError.name)
          console.error('Fallback error message:', fallbackError.message)
          console.error('Fallback error stack:', fallbackError.stack)
        }
        // Only use minimal hardcoded fallback as absolute last resort
        console.warn('⚠️ Using minimal fallback - AI services unavailable')
        return buildMinimalFallbackAnalysis(resumeText)
      }
    }
    throw error
  }
}

/**
 * Attempts a simpler AI analysis when the main analysis fails
 * Uses a shorter prompt and lower temperature for more reliable results
 */
async function attemptSimpleAIAnalysis(
  resumeText: string,
  profileContext: string,
  targetRole?: string | null
): Promise<ResumeAnalysisResult> {
  const messages = [
    {
      role: 'system' as const,
      content:
        'You are a professional resume reviewer. Analyze resumes from any industry (IT/Tech, Business, Healthcare, Education, Marketing, Sales, Design, etc.). Extract all skills, detect the industry/field, suggest relevant specific job titles, identify strengths and weaknesses based on actual resume content. Respond with valid JSON only.',
    },
    {
      role: 'user' as const,
      content: `Analyze this resume:

${resumeText.substring(0, 4000)}${resumeText.length > 4000 ? ' ...(truncated)' : ''}

${profileContext ? `Profile: ${profileContext}\n` : ''}
${targetRole ? `Target Role: ${targetRole}\n` : ''}

Return JSON with:
- overallScore: number (0-100)
- careerAlignment: { matchScore: number, careers: Array<{ title: string, matchScore: number }> }
- improvementSuggestions: Array<{ area: string, suggestion: string, priority: "high"|"medium"|"low" }>
- strengths: string[]
- weaknesses: string[]
- skillsIdentified: string[]

Extract ALL skills from all sections (technical, business, healthcare, education, marketing, sales, design, etc.). Detect the industry/field from the resume. Suggest specific job titles relevant to that industry. Base all feedback on actual resume content.`,
    },
  ]

  try {
    console.log('🤖 Calling simple AI fallback for resume analysis...')
    const result = await callAIWithFallback(messages, {
      model: PERPLEXITY_DEFAULT_MODEL,
      temperature: 0.5, // Lower temperature for more consistent results
      responseFormat: 'json_object',
    })

    const content = result.content || '{}'
    console.log('Simple AI fallback response received, content length:', content.length)
    
    try {
      const parsed = JSON.parse(content)
      return validateAndNormalizeAnalysis(parsed)
    } catch (parseError) {
      console.error('Simple AI fallback JSON parsing error:', parseError)
      console.error('Failed content:', content.substring(0, 500))
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[1])
          return validateAndNormalizeAnalysis(extracted)
        } catch (extractError) {
          console.error('Failed to parse extracted JSON from simple fallback:', extractError)
        }
      }
      
      throw new Error(`Failed to parse simple AI fallback response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }
  } catch (error) {
    console.error('Simple AI fallback call failed:', error)
    throw error
  }
}

/**
 * Minimal hardcoded fallback - only used when AI is completely unavailable
 * Provides basic structure without specific recommendations
 */
function buildMinimalFallbackAnalysis(resumeText: string): ResumeAnalysisResult {
  const cleaned = resumeText.replace(/\s+/g, ' ').trim()
  const wordCount = cleaned ? cleaned.split(' ').length : 0

  // Extract basic skills across all industries (for display only - AI should generate proper analysis)
  const skillKeywords = [
    // IT/Tech
    'HTML', 'CSS', 'JavaScript', 'Python', 'Java', 'React', 'Angular', 'Vue', 'WordPress',
    'Networking', 'System Administration', 'IT Support', 'Data Analytics', 'SQL',
    // Business/Finance
    'Excel', 'Financial Analysis', 'Accounting', 'QuickBooks', 'SAP', 'Salesforce', 'CRM',
    // Healthcare
    'Healthcare', 'Medical', 'Patient Care', 'HIPAA', 'EMR', 'Electronic Health Records',
    // Education
    'Teaching', 'Curriculum', 'Education', 'Training', 'Instructional Design',
    // Marketing
    'SEO', 'Social Media', 'Content Marketing', 'Digital Marketing', 'Google Analytics', 'Email Marketing',
    // Sales
    'Sales', 'Business Development', 'Account Management', 'Lead Generation',
    // Design
    'Graphic Design', 'UI/UX', 'Adobe', 'Figma', 'Photoshop', 'Illustrator',
  ]

  const foundSkills: string[] = []
  const lowerText = cleaned.toLowerCase()

  for (const skill of skillKeywords) {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill)
    }
  }

  const inferredSkills = Array.from(new Set(foundSkills)).slice(0, 10)

  // Minimal fallback - just provide structure, no specific recommendations
  return {
    overallScore: Math.min(65 + Math.round((wordCount % 40) / 2), 75),
    careerAlignment: {
      matchScore: 60,
      careers: [
        { title: 'Please try again for AI-generated career suggestions', matchScore: 0 },
      ],
    },
    improvementSuggestions: [
      {
        area: 'Resume Analysis',
        suggestion: 'AI analysis service is currently unavailable. Please try again later for personalized feedback.',
        priority: 'high',
      },
    ],
    strengths: [
      'Resume uploaded successfully. AI analysis will provide specific strengths when available.',
    ],
    weaknesses: [
      'Unable to generate AI-powered analysis. Please try again when the service is available.',
    ],
    skillsIdentified: inferredSkills.length > 0 ? inferredSkills : [],
  }
}

export function formatResumeAnalysisMessage(options: {
  analysis: ResumeAnalysisResult
  resumeName?: string
  userPrompt?: string
}): string {
  const { analysis, resumeName, userPrompt } = options
  const sections: string[] = []

  const headerLines = [`Here’s what I spotted in **${resumeName || 'your resume'}**:`]
  if (analysis.overallScore) {
    headerLines.push(`- **Resume score:** ${analysis.overallScore}/100`)
  }
  if (userPrompt) {
    headerLines.push(`- **Your note:** ${userPrompt}`)
  }
  sections.push(headerLines.join('\n'))

  if (analysis.strengths?.length) {
    sections.push(`**Where you’re strong**\n${analysis.strengths.map((item) => `- ${item}`).join('\n')}`)
  }

  if (analysis.improvementSuggestions?.length) {
    const improvementBullets = analysis.improvementSuggestions.map((s) => `- ${s.area}: ${s.suggestion} (${s.priority} priority)`).join('\n')
    sections.push(`**Opportunities to improve**\n${improvementBullets}`)
  }

  if (analysis.careerAlignment?.careers?.length) {
    const careerBullets = analysis.careerAlignment.careers
      .slice(0, 3)
      .map((c) => `- ${c.title} (match ${c.matchScore}% )`)
      .join('\n')
    sections.push(`**Career paths to explore**\n${careerBullets}`)
  }

  if (analysis.skillsIdentified?.length) {
    sections.push(`**Skills I noticed**\n${analysis.skillsIdentified.map((skill) => `- ${skill}`).join('\n')}`)
  }

  const closing = `Let me know if you’d like a tailored action plan or help drafting bullet points. I’m happy to dive deeper!`
  sections.push(closing)

  return sections.join('\n\n')
}





