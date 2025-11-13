/**
 * Unified AI Client
 * Provides a single interface for all AI providers (OpenAI, Perplexity, etc.)
 * with built-in caching, retry logic, and error handling
 */

import { getPerplexityHeaders, PERPLEXITY_API_URL, PERPLEXITY_DEFAULT_MODEL } from '../openai'
import { memoryCache } from '../cache/memory-cache'

export type AIProvider = 'openai' | 'perplexity' | 'anthropic'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  responseFormat?: 'text' | 'json_object'
  cache?: boolean
  cacheTTL?: number // seconds
}

export interface ChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamingResponse {
  stream: ReadableStream<Uint8Array>
  contentType: string
}

/**
 * Unified AI Client supporting multiple providers
 */
export class UnifiedAIClient {
  private provider: AIProvider
  private defaultModel: string
  private cache: typeof memoryCache

  constructor(provider: AIProvider = 'perplexity', cache: typeof memoryCache = memoryCache) {
    this.provider = provider
    this.cache = cache
    this.defaultModel = this.getDefaultModel(provider)
  }

  private getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
      case 'perplexity':
        return PERPLEXITY_DEFAULT_MODEL
      case 'anthropic':
        return process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229'
      default:
        return PERPLEXITY_DEFAULT_MODEL
    }
  }

  /**
   * Generates a cache key from messages
   */
  private generateCacheKey(messages: ChatMessage[], options?: ChatOptions): string {
    const key = JSON.stringify({
      provider: this.provider,
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature,
    })
    return `ai:${this.provider}:${Buffer.from(key).toString('base64').substring(0, 100)}`
  }

  /**
   * Chat completion (non-streaming)
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const cacheKey = this.generateCacheKey(messages, options)

    // Check cache if enabled
    if (options.cache !== false) {
      const cached = this.cache.get<ChatResponse>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Call appropriate provider
    let response: ChatResponse
    try {
      switch (this.provider) {
        case 'openai':
          response = await this.callOpenAI(messages, options)
          break
        case 'perplexity':
          response = await this.callPerplexity(messages, options)
          break
        case 'anthropic':
          response = await this.callAnthropic(messages, options)
          break
        default:
          throw new Error(`Unsupported provider: ${this.provider}`)
      }
    } catch (error) {
      // Retry logic (simple - can be enhanced)
      if (error instanceof Error && error.message.includes('rate limit')) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        switch (this.provider) {
          case 'openai':
            response = await this.callOpenAI(messages, options)
            break
          case 'perplexity':
            response = await this.callPerplexity(messages, options)
            break
          case 'anthropic':
            response = await this.callAnthropic(messages, options)
            break
        }
      } else {
        throw error
      }
    }

    // Cache response if enabled
    if (options.cache !== false) {
      this.cache.set(cacheKey, response, options.cacheTTL || 3600)
    }

    return response
  }

  /**
   * Streaming chat completion
   */
  async chatStream(messages: ChatMessage[], options: ChatOptions = {}): Promise<StreamingResponse> {
    switch (this.provider) {
      case 'perplexity':
        return this.callPerplexityStream(messages, options)
      case 'openai':
        return this.callOpenAIStream(messages, options)
      default:
        throw new Error(`Streaming not supported for provider: ${this.provider}`)
    }
  }

  /**
   * Call Perplexity API
   */
  private async callPerplexity(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    // Check if Perplexity API key is available (treat empty strings as missing)
    const rawPerplexityKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY
    const rawGeminiKey = process.env.GEMINI_API_KEY
    const perplexityApiKey = rawPerplexityKey?.trim() || null
    const geminiApiKey = rawGeminiKey?.trim() || null

    // If Perplexity key is missing and Gemini is available, use Gemini fallback
    if (!perplexityApiKey && geminiApiKey) {
      console.warn('Perplexity API key not set, using Gemini fallback in UnifiedAIClient')
      const { callGeminiAPI, GEMINI_DEFAULT_MODEL } = await import('../openai')
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
      return {
        content: result.content,
        model: result.model,
      }
    }

    // If neither API key is available, throw error
    if (!perplexityApiKey && !geminiApiKey) {
      throw new Error('Neither PERPLEXITY_API_KEY nor GEMINI_API_KEY is set. Please configure at least one API key.')
    }

    // Safety check: ensure Perplexity key exists before calling getPerplexityHeaders()
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key is required but not set. Please configure PERPLEXITY_API_KEY or use GEMINI_API_KEY.')
    }

    const headers = getPerplexityHeaders()
    const model = options.model || this.defaultModel

    const body: any = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
    }

    if (options.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' }
    }

    const resp = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      throw new Error(`Perplexity API error: ${errorText}`)
    }

    const data = await resp.json()
    const content = data.choices?.[0]?.message?.content || ''

    return {
      content,
      model: data.model || model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
    }
  }

  /**
   * Call Perplexity API (streaming)
   */
  private async callPerplexityStream(
    messages: ChatMessage[],
    options: ChatOptions
  ): Promise<StreamingResponse> {
    // Check if Perplexity API key is available (treat empty strings as missing)
    const rawPerplexityKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY
    const rawGeminiKey = process.env.GEMINI_API_KEY
    const perplexityApiKey = rawPerplexityKey?.trim() || null
    const geminiApiKey = rawGeminiKey?.trim() || null

    // If Perplexity key is missing, throw error (streaming not supported for Gemini fallback yet)
    if (!perplexityApiKey) {
      if (geminiApiKey) {
        throw new Error('Streaming not supported with Gemini fallback. Use non-streaming chat() method instead.')
      }
      throw new Error('PERPLEXITY_API_KEY is not set and streaming requires Perplexity.')
    }

    const headers = getPerplexityHeaders()
    const model = options.model || this.defaultModel

    const resp = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: options.temperature ?? 0.7,
      }),
    })

    if (!resp.ok || !resp.body) {
      throw new Error('Perplexity streaming request failed')
    }

    return {
      stream: resp.body,
      contentType: 'text/event-stream',
    }
  }

  /**
   * Call OpenAI API (placeholder - requires OpenAI SDK)
   */
  private async callOpenAI(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    // For now, fallback to Perplexity if OpenAI not configured
    // In production, implement OpenAI SDK integration
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, falling back to Perplexity')
      return this.callPerplexity(messages, options)
    }

    // TODO: Implement OpenAI SDK integration
    throw new Error('OpenAI integration not yet implemented. Use Perplexity provider.')
  }

  /**
   * Call OpenAI API (streaming)
   */
  private async callOpenAIStream(
    messages: ChatMessage[],
    options: ChatOptions
  ): Promise<StreamingResponse> {
    // TODO: Implement OpenAI streaming
    throw new Error('OpenAI streaming not yet implemented. Use Perplexity provider.')
  }

  /**
   * Call Anthropic API (placeholder)
   */
  private async callAnthropic(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    // TODO: Implement Anthropic SDK integration
    throw new Error('Anthropic integration not yet implemented. Use Perplexity provider.')
  }
}

// Singleton instance
export const aiClient = new UnifiedAIClient(
  (process.env.AI_PROVIDER as AIProvider) || 'perplexity'
)




