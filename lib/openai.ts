/**
 * AI Client Configuration
 */

import type { IntentCategory } from '@/lib/ai/chat-response'

export function getPerplexityHeaders() {
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    const errorMsg = 'PERPLEXITY_API_KEY (or OPENAI_API_KEY) is not set in environment variables. Please set it in your .env file.'
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMsg)
    }
    throw new Error(errorMsg)
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'
export const PERPLEXITY_DEFAULT_MODEL = process.env.PERPLEXITY_MODEL || 'sonar'

export interface CareerGuidePromptOptions {
  userMessage: string
  personaContext: string
  profileContext?: string
  detectedIntent: IntentCategory
  userStage: string
  targetRole?: string
  currentRole?: string
  resumeSummary?: string
  conversationSummary?: string
  missingDetails?: string[]
  personaName?: string
  memorySummary?: string
  intentFocus?: string
  marketSnapshot?: string | null
  recommendedProjects?: string[]
  interestLabel?: string | null
  recommendedCareers?: string[]
}

export function buildCareerGuideUserPrompt(options: CareerGuidePromptOptions): string {
  const profileLine = options.profileContext?.trim().length
    ? options.profileContext.trim()
    : 'No additional profile context provided.'

  const targetLine = options.targetRole ? `Target role: ${options.targetRole}` : 'Target role: unclear — ask the user to clarify before planning.'
  const currentLine = options.currentRole ? `Current role: ${options.currentRole}` : 'Current role: not confirmed.'
  const resumeLine = options.resumeSummary?.trim().length
    ? `Resume highlights:
${options.resumeSummary.trim()}`
    : 'Resume highlights: none provided yet.'
  const historyLine = options.conversationSummary?.trim().length
    ? `Recent conversation notes:\n${options.conversationSummary.trim()}`
    : 'Recent conversation notes: no prior context.'
  const missingContextLine = options.missingDetails?.length
    ? `Missing context to clarify first: ${options.missingDetails.join(', ')}`
    : 'Missing context to clarify first: none.'
  const personaLine = options.personaName ? `Active persona: ${options.personaName}` : 'Active persona: General global career strategist.'
  const memoryLine = options.memorySummary?.trim().length
    ? `Remembered facts for this conversation: ${options.memorySummary.trim()}`
    : 'Remembered facts: none yet.'
  const missionLine = options.intentFocus
    ? `Coaching mission: ${options.intentFocus}`
    : `Coaching mission: Stay on brief for ${options.detectedIntent}.`
  const marketLine = options.marketSnapshot?.trim().length
    ? `Philippines market insight:\n${options.marketSnapshot.trim()}`
    : null
  const projectLine =
    options.recommendedProjects && options.recommendedProjects.length
      ? `Proof-of-work suggestions:\n${options.recommendedProjects.slice(0, 3).map((item) => `- ${item}`).join('\n')}`
      : null
  const interestLine = options.interestLabel?.trim().length
    ? `Stated interest focus: ${options.interestLabel.trim()}`
    : 'Stated interest focus: not explicitly stated—mirror any interest cues from the user message.'
  const careerLine =
    options.recommendedCareers && options.recommendedCareers.length
      ? `PH career paths to emphasise first: ${options.recommendedCareers.join(', ')}`
      : 'PH career paths: surface 3–4 beginner-friendly roles aligned with the user’s interest.'

  return [
    `User stage: ${options.userStage}`,
    `Detected intent: ${options.detectedIntent}`,
    `Persona context: ${options.personaContext}`,
    targetLine,
    currentLine,
    `Profile context: ${profileLine}`,
    personaLine,
    memoryLine,
    resumeLine,
    historyLine,
    missingContextLine,
    marketLine,
    projectLine,
    interestLine,
    careerLine,
    missionLine,
    'Instruction: Follow the system behaviour. Use this context to shape bold Key Insights and actionable Next Steps, correcting weak ideas when needed.',
    `User message: ${options.userMessage}`,
  ].join('\n')
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}
