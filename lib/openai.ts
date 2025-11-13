/**
 * AI Client Configuration
 */

import type { IntentCategory } from '@/lib/ai/chat-response'

export function getPerplexityHeaders() {
  const rawApiKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY
  const apiKey = rawApiKey?.trim() || null
  
  if (!apiKey) {
    const errorMsg = 'PERPLEXITY_API_KEY (or OPENAI_API_KEY) is not set in environment variables. Please set it in your .env file.'
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMsg)
      console.error('Raw value:', rawApiKey === undefined ? 'undefined' : rawApiKey === '' ? 'empty string' : `"${rawApiKey}"`)
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

// Gemini API Configuration
export function getGeminiHeaders() {
  const rawApiKey = process.env.GEMINI_API_KEY
  const apiKey = rawApiKey?.trim() || null
  
  if (!apiKey) {
    const errorMsg = 'GEMINI_API_KEY is not set in environment variables. Please set it in your .env file.'
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMsg)
      console.error('Raw value:', rawApiKey === undefined ? 'undefined' : rawApiKey === '' ? 'empty string' : `"${rawApiKey}"`)
    }
    throw new Error(errorMsg)
  }
  return {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  }
}

export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'
export const GEMINI_DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'

/**
 * Convert OpenAI/Perplexity format messages to Gemini format
 * Gemini doesn't support system messages, so we combine them with the first user message
 */
function convertMessagesToGeminiFormat(messages: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  console.log('Converting messages to Gemini format, input count:', messages.length)
  const geminiMessages: Array<{ role: string; parts: Array<{ text: string }> }> = []
  let systemContent = ''

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Collect system messages to prepend to first user message
      systemContent += (systemContent ? '\n\n' : '') + msg.content
      console.log('Collected system message, length:', msg.content.length)
    } else if (msg.role === 'user') {
      // Combine system content with user message if available
      const userContent = systemContent ? `${systemContent}\n\n${msg.content}` : msg.content
      geminiMessages.push({
        role: 'user',
        parts: [{ text: userContent }],
      })
      console.log('Added user message, total length:', userContent.length, 'system prepended:', !!systemContent)
      systemContent = '' // Clear after using
    } else if (msg.role === 'assistant') {
      geminiMessages.push({
        role: 'model',
        parts: [{ text: msg.content }],
      })
      console.log('Added assistant message, length:', msg.content.length)
    }
  }

  // If there's leftover system content without a user message, add it as user message
  if (systemContent && geminiMessages.length === 0) {
    geminiMessages.push({
      role: 'user',
      parts: [{ text: systemContent }],
    })
    console.log('Added system content as user message (no user messages found)')
  }

  console.log('Conversion complete, output count:', geminiMessages.length)
  return geminiMessages
}

/**
 * Convert Gemini response to OpenAI/Perplexity format
 */
function convertGeminiResponseToStandardFormat(geminiResponse: any, model: string): { content: string; model: string } {
  console.log('Converting Gemini response, structure:', {
    hasCandidates: !!geminiResponse.candidates,
    candidatesLength: geminiResponse.candidates?.length || 0,
    firstCandidate: geminiResponse.candidates?.[0] ? {
      hasContent: !!geminiResponse.candidates[0].content,
      hasParts: !!geminiResponse.candidates[0].content?.parts,
      partsLength: geminiResponse.candidates[0].content?.parts?.length || 0,
    } : null,
  })
  
  const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  if (!content) {
    console.warn('Gemini response has no content, full response:', JSON.stringify(geminiResponse, null, 2))
  }
  
  return {
    content: content.trim() || 'I apologize, but I was unable to generate a response. Please try again.',
    model,
  }
}

/**
 * Call Gemini API
 */
export async function callGeminiAPI(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<{ content: string; model: string }> {
  console.log('callGeminiAPI called with:', {
    messageCount: messages.length,
    model: options.model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  })
  
  const rawApiKey = process.env.GEMINI_API_KEY
  const apiKey = rawApiKey?.trim() || null
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in environment variables')
    console.error('Raw value:', rawApiKey === undefined ? 'undefined' : rawApiKey === '' ? 'empty string' : `"${rawApiKey}"`)
    throw new Error('GEMINI_API_KEY is not set')
  }

  console.log('✅ GEMINI_API_KEY found, length:', apiKey.length)

  const model = options.model || GEMINI_DEFAULT_MODEL
  const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`

  console.log('Using Gemini model:', model)
  console.log('API URL (key hidden):', url.replace(apiKey, '***'))

  // Convert messages to Gemini format
  // Combine system messages with the first user message
  const geminiMessages = convertMessagesToGeminiFormat(messages)
  console.log('Converted to Gemini format, message count:', geminiMessages.length)

  const body: any = {
    contents: geminiMessages,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
    },
  }

  // Note: Gemini doesn't support JSON mode like Perplexity/OpenAI
  // If JSON format is required, we'll need to add instructions in the prompt
  // For now, we'll let the model respond naturally and parse JSON from the response

  console.log('Making Gemini API request to:', url.replace(apiKey, '***'))
  console.log('Request body size:', JSON.stringify(body).length, 'bytes')
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  console.log('Gemini API response status:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error response:', errorText)
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  let data
  try {
    data = await response.json()
    console.log('✅ Gemini API response received, parsing JSON...')
  } catch (jsonError) {
    console.error('❌ Failed to parse Gemini response as JSON:', jsonError)
    const textResponse = await response.text()
    console.error('Raw response:', textResponse.substring(0, 500))
    throw new Error(`Failed to parse Gemini API response as JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`)
  }
  
  const result = convertGeminiResponseToStandardFormat(data, model)
  console.log('✅ Gemini response converted, content length:', result.content?.length || 0)
  
  if (!result.content || result.content.trim().length === 0) {
    console.warn('⚠️ Warning: Gemini returned empty content')
  }
  
  return result
}

/**
 * Check if an error indicates we should fallback to Gemini
 */
function shouldFallbackToGemini(error: any): boolean {
  if (!error) return false

  const errorMessage = error.message?.toLowerCase() || ''
  const errorString = String(error).toLowerCase()

  // Check for common error conditions that warrant fallback
  const fallbackIndicators = [
    'credit',
    'quota',
    'insufficient',
    '401',
    '402',
    '403',
    '429',
    '500',
    '502',
    '503',
    '504',
    'rate limit',
    'perplexity',
    'not set',
    'missing',
    'is not set',
    'not configured',
    'api key',
  ]

  return fallbackIndicators.some((indicator) => errorMessage.includes(indicator) || errorString.includes(indicator))
}

/**
 * Call AI API with fallback: Try Perplexity first, fallback to Gemini on error
 */
export async function callAIWithFallback(
  messages: ChatMessage[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
    responseFormat?: 'text' | 'json_object'
  } = {}
): Promise<{ content: string; model: string; provider: 'perplexity' | 'gemini' }> {
  // Check if Perplexity API key is available (treat empty strings as missing)
  const rawPerplexityKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY
  const rawGeminiKey = process.env.GEMINI_API_KEY
  const perplexityApiKey = rawPerplexityKey?.trim() || null
  const geminiApiKey = rawGeminiKey?.trim() || null

  // Debug logging for API key detection
  console.log('API Key Detection:', {
    hasPerplexityKey: !!perplexityApiKey,
    perplexityKeyLength: perplexityApiKey?.length || 0,
    hasGeminiKey: !!geminiApiKey,
    geminiKeyLength: geminiApiKey?.length || 0,
    perplexityKeyPreview: perplexityApiKey ? `${perplexityApiKey.substring(0, 10)}...` : 'NOT SET',
    geminiKeyPreview: geminiApiKey ? `${geminiApiKey.substring(0, 10)}...` : 'NOT SET',
    rawPerplexityValue: rawPerplexityKey === undefined ? 'undefined' : rawPerplexityKey === '' ? 'empty string' : `"${rawPerplexityKey.substring(0, 20)}..."`,
    rawGeminiValue: rawGeminiKey === undefined ? 'undefined' : rawGeminiKey === '' ? 'empty string' : `"${rawGeminiKey.substring(0, 20)}..."`,
  })

  // If Perplexity key is missing and Gemini is available, use Gemini directly
  if (!perplexityApiKey && geminiApiKey) {
    console.warn('Perplexity API key not set, using Gemini directly')
    console.log('Calling Gemini API with', messages.length, 'messages')
    try {
      // Use Gemini model instead of Perplexity model
      const geminiModel = options.model && options.model.startsWith('gemini-') 
        ? options.model 
        : GEMINI_DEFAULT_MODEL
      console.log('Using Gemini model:', geminiModel, '(original model was:', options.model, ')')
      const result = await callGeminiAPI(messages, {
        model: geminiModel,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      })
      console.log('Gemini API call successful, content length:', result.content?.length || 0)
      return {
        ...result,
        provider: 'gemini',
      }
    } catch (geminiError) {
      console.error('Gemini API failed:', geminiError)
      if (geminiError instanceof Error) {
        console.error('Gemini error details:', {
          message: geminiError.message,
          stack: geminiError.stack,
        })
      }
      throw new Error(`Gemini API failed: ${geminiError instanceof Error ? geminiError.message : String(geminiError)}`)
    }
  }

  // If neither API key is available, throw error
  if (!perplexityApiKey && !geminiApiKey) {
    throw new Error('Neither PERPLEXITY_API_KEY nor GEMINI_API_KEY is set. Please configure at least one API key.')
  }

  // Try Perplexity first (only if key exists)
  if (!perplexityApiKey) {
    // This shouldn't happen due to check above, but add safety check
    throw new Error('Perplexity API key is required but not set. Please configure PERPLEXITY_API_KEY or use GEMINI_API_KEY.')
  }

  try {
    const headers = getPerplexityHeaders()
    const model = options.model || PERPLEXITY_DEFAULT_MODEL

    const body: any = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      stream: options.stream || false,
    }

    if (options.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' }
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const error = new Error(`Perplexity API error: ${errorText}`)
      if (shouldFallbackToGemini(error)) {
        throw error
      }
      throw error
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return {
      content: content.trim(),
      model: data.model || model,
      provider: 'perplexity',
    }
  } catch (error) {
    // Fallback to Gemini if Perplexity fails
    if (shouldFallbackToGemini(error) && geminiApiKey) {
      console.warn('Perplexity API failed, falling back to Gemini:', error instanceof Error ? error.message : String(error))
      try {
        // Use Gemini model instead of Perplexity model
        const geminiModel = options.model && options.model.startsWith('gemini-') 
          ? options.model 
          : GEMINI_DEFAULT_MODEL
        console.log('Falling back to Gemini model:', geminiModel, '(original Perplexity model was:', options.model, ')')
        const result = await callGeminiAPI(messages, {
          model: geminiModel,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        })
        return {
          ...result,
          provider: 'gemini',
        }
      } catch (geminiError) {
        console.error('Gemini fallback also failed:', geminiError)
        throw new Error(`Both Perplexity and Gemini APIs failed. Perplexity: ${error instanceof Error ? error.message : String(error)}, Gemini: ${geminiError instanceof Error ? geminiError.message : String(geminiError)}`)
      }
    }
    // If fallback conditions not met or Gemini not configured, throw original error
    throw error
  }
}

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
