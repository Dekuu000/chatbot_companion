/**
 * Chat Page - AI chatbot interface with streaming responses
 */

'use client'

import { useState, useEffect, useRef, ChangeEvent, useMemo, useCallback } from 'react'
import { MessageSquare, Send, User, Bot, Copy, Check, Sparkles, Paperclip, X, Menu } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { useSessionContext } from '@/components/providers/session-provider'
import { useSidebarContext } from '@/components/layout/sidebar-layout'
import type { ConversationTags } from '@/lib/ai/conversation-state'
import { describeInterest } from '@/lib/ai/interest-profiles'
import AdvisorCardMinimal, { type AdvisorResponse } from '@/components/AdvisorCardMinimal'
import { shouldUseAdvisorFlow } from '@/lib/ai/advisor-routing'
import { sanitizeAssistantContent } from '@/lib/ai/chat-response'

interface UserMessage {
  role: 'user'
  content: string
}

interface AssistantMessage {
  role: 'assistant'
  content: string
  raw?: string
  advisor?: AdvisorResponse
  fallback?: boolean
}

type Message = UserMessage | AssistantMessage

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [authPromptVisible, setAuthPromptVisible] = useState(false)
  const [conversationContext, setConversationContext] = useState<ConversationTags | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assistantMessageIndexRef = useRef<number | null>(null)
  const conversationContextRef = useRef<ConversationTags | null>(null)
  const pendingConversationIdRef = useRef<string | null>(null)
  const reloadStateRef = useRef<'pending' | 'handled' | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state: sessionState, status: sessionStatus } = useSessionContext()
  const userId = sessionState.user?.userId ?? null
  const isAuthenticated = sessionState.mode === 'authenticated'
  const guestId = sessionState.guestId ?? null
  
  // Get sidebar context for mobile toggle
  let sidebarContext = null
  try {
    sidebarContext = useSidebarContext()
  } catch {
    // Sidebar context not available (e.g., on non-sidebar pages)
    sidebarContext = null
  }
  const { isMobileSidebarOpen, toggleMobileSidebar } = sidebarContext || { isMobileSidebarOpen: false, toggleMobileSidebar: () => {} }
  const markExistingNavigation = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('chat:navigate', 'existing')
      window.sessionStorage.setItem('chat:reload', 'handled')
    }
  }, [])
  const analyticsHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (isAuthenticated && userId) {
      headers['x-user-id'] = userId
    } else if (guestId) {
      headers['x-guest-id'] = guestId
    }
    return headers
  }, [guestId, isAuthenticated, userId])
  const loadConversationMessages = useCallback(async (convId: string, currentUserId: string) => {
    try {
      if (!currentUserId) return

      const response = await fetch(`/api/conversations/${convId}/messages?userId=${currentUserId}`, {
        headers: {
          'x-user-id': currentUserId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        const loadedMessages: Message[] = (data.messages || []).map((msg: any) => {
          const rawContent = typeof msg.content === 'string' ? msg.content : ''
          if (msg.role === 'assistant') {
            const content = sanitizeAssistantContent(rawContent)
            return {
              role: 'assistant',
              content,
              raw: content,
            } as AssistantMessage
          }
          return {
            role: 'user',
            content: rawContent,
          } as UserMessage
        })
        setMessages(loadedMessages)
        setConversationContext(data.contextTags || null)
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error)
    }
  }, [])
  const logClientEvent = useCallback(
    async (action: string, metadata?: Record<string, unknown>) => {
      const contextSnapshot = conversationContextRef.current
      const mergedMetadata: Record<string, unknown> = {
        ...(metadata ?? {}),
      }
      if (contextSnapshot) {
        if (!('targetRole' in mergedMetadata)) {
          mergedMetadata.targetRole = contextSnapshot.targetRole ?? null
        }
        if (!('interestKey' in mergedMetadata)) {
          mergedMetadata.interestKey = contextSnapshot.interestKey ?? null
        }
      }

      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: analyticsHeaders,
          body: JSON.stringify({ action, metadata: mergedMetadata }),
        })
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('analytics_event_skip', error)
        }
      }
    },
    [analyticsHeaders]
  )
  const interestDisplay = useMemo(() => describeInterest(conversationContext?.interestKey ?? null), [conversationContext?.interestKey])

  const handleSeedPrompt = useCallback(
    (prompt: string) => {
      setInput(prompt)
      logClientEvent('chat_quick_prompt_select', { prompt })
    },
    [logClientEvent]
  )

  useEffect(() => {
    if (isAuthenticated) {
      setAuthPromptVisible(false)
      setAttachmentError(null)
    }
  }, [isAuthenticated])

  useEffect(() => {
    conversationContextRef.current = conversationContext
  }, [conversationContext])

  // Load conversationId from URL params
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (reloadStateRef.current) return

    const stored = window.sessionStorage.getItem('chat:reload')
    if (stored === 'pending' || stored === 'handled') {
      reloadStateRef.current = stored
      return
    }

    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const lastType = entries && entries.length > 0 ? entries[entries.length - 1].type : 'navigate'
    if (lastType === 'reload') {
      reloadStateRef.current = 'pending'
      window.sessionStorage.setItem('chat:reload', 'pending')
    } else {
      reloadStateRef.current = 'handled'
      window.sessionStorage.setItem('chat:reload', 'handled')
    }
  }, [])

  useEffect(() => {
    if (sessionStatus !== 'ready') return
    if (typeof window === 'undefined') return

    const convParam = searchParams?.get?.('c') ?? null
    const override = window.sessionStorage.getItem('chat:navigate')
    const reloadState =
      reloadStateRef.current ??
      (() => {
        const storedState = window.sessionStorage.getItem('chat:reload') as 'pending' | 'handled' | null
        reloadStateRef.current = storedState ?? null
        return reloadStateRef.current
      })()
    const isReloadPending = reloadState === 'pending'

    const loadExistingConversation = (id: string) => {
      if (!id || !userId || !isAuthenticated) return
      const alreadyLoaded = conversationId === id && messages.length > 0 && pendingConversationIdRef.current == null
      if (alreadyLoaded) return

      pendingConversationIdRef.current = id
      loadConversationMessages(id, userId)
        .catch(() => {
          /* errors are logged inside loader */
        })
        .finally(() => {
          if (pendingConversationIdRef.current === id) {
            pendingConversationIdRef.current = null
          }
        })
    }

    if (convParam && userId && isAuthenticated) {
      if (isReloadPending && override !== 'existing') {
        router.replace('/chat')
        pendingConversationIdRef.current = null
        if (conversationId !== null) setConversationId(null)
        if (messages.length) setMessages([])
        setConversationContext(null)
        reloadStateRef.current = 'handled'
        window.sessionStorage.setItem('chat:reload', 'handled')
        return
      }
      if (override === 'existing') {
        window.sessionStorage.removeItem('chat:navigate')
        reloadStateRef.current = 'handled'
        window.sessionStorage.setItem('chat:reload', 'handled')
      }
      if (convParam !== conversationId) {
        setConversationId(convParam)
      }
      loadExistingConversation(convParam)
      return
    }

    if (override === 'existing') {
      window.sessionStorage.removeItem('chat:navigate')
      reloadStateRef.current = 'handled'
      window.sessionStorage.setItem('chat:reload', 'handled')
    }

    if (!convParam) {
      if (pendingConversationIdRef.current) return
      if (conversationId !== null) {
        setConversationId(null)
      }
      if (reloadStateRef.current === 'pending') {
        setMessages([])
        setConversationContext(null)
        reloadStateRef.current = 'handled'
        window.sessionStorage.setItem('chat:reload', 'handled')
      }
    }
  }, [conversationId, isAuthenticated, loadConversationMessages, messages.length, router, searchParams, sessionStatus, userId])

  const refreshConversationMetadata = async (convId: string, currentUserId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}?userId=${currentUserId}`, {
        headers: {
          'x-user-id': currentUserId,
        },
      })
      if (!response.ok) return
      const data = await response.json()
      setConversationContext(data.conversation?.contextTags || null)
    } catch (error) {
      console.error('Failed to refresh conversation context:', error)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`
  }, [input])

  const handleCopyMessage = async (message: AssistantMessage, index: number) => {
    try {
      const text = message.raw ?? message.content
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const appendUserMessageWithPlaceholder = (content: string) => {
    setMessages((prev) => {
      const next: Message[] = [
        ...prev,
        { role: 'user', content } satisfies UserMessage,
        { role: 'assistant', content: '', raw: '' } satisfies AssistantMessage,
      ]
      assistantMessageIndexRef.current = next.length - 1
      return next
    })
  }

  const setAssistantMessage = (update: Partial<AssistantMessage>) => {
    setMessages((prev) => {
      const next: Message[] = [...prev]
      let index = assistantMessageIndexRef.current ?? -1

      if (index < 0) {
        index = next.findIndex((msg) => msg.role === 'assistant' && (msg as AssistantMessage).content === '')
      }

        const buildAssistant = (existing?: AssistantMessage): AssistantMessage => {
        const base: AssistantMessage = existing
          ? { ...existing }
          : { role: 'assistant', content: '', raw: '', fallback: false }

        const nextRaw = sanitizeAssistantContent(update.raw ?? update.content ?? base.raw ?? '')
        const nextContent = sanitizeAssistantContent(update.content ?? update.raw ?? base.content ?? '')

        return {
          role: 'assistant',
          content: nextContent,
          raw: nextRaw,
          advisor: update.advisor ?? base.advisor,
          fallback: update.fallback ?? base.fallback ?? false,
        }
      }

      if (index >= 0 && next[index]?.role === 'assistant') {
        next[index] = buildAssistant(next[index] as AssistantMessage)
      } else {
        next.push(buildAssistant())
        index = next.length - 1
      }

      assistantMessageIndexRef.current = index
      return next
    })

    assistantMessageIndexRef.current = null
  }

  const resetAttachment = () => {
    setAttachedFile(null)
    setAttachmentError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAttachmentSelection = (file: File | null) => {
    if (!isAuthenticated) {
      resetAttachment()
      setAttachmentError('Sign in to upload a resume for feedback.')
      setAuthPromptVisible(true)
      return
    }

    if (!file) {
      resetAttachment()
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    if (!allowedTypes.includes(file.type)) {
      setAttachmentError('Please upload a PDF, DOCX, or TXT resume.')
      resetAttachment()
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setAttachmentError('Resume must be less than 10MB.')
      resetAttachment()
      return
    }

    setAttachmentError(null)
    setAttachedFile(file)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    handleAttachmentSelection(file)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isTyping) return

    const trimmedInput = input.trim()
    if (!trimmedInput && !attachedFile) return

    const userMessageParts: string[] = []
    if (trimmedInput) {
      userMessageParts.push(trimmedInput)
    }
    if (attachedFile) {
      userMessageParts.push(`📎 Uploaded resume: ${attachedFile.name}`)
    }

    const userBubbleContent = userMessageParts.join('\n\n')
    const conversationHistory = messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => {
        if (msg.role === 'assistant') {
          const assistantMsg = msg as AssistantMessage
          return {
            role: 'assistant' as const,
            content: sanitizeAssistantContent(assistantMsg.raw ?? assistantMsg.content),
          }
        }
        return {
          role: 'user' as const,
          content: msg.content,
        }
      })

    const advisorFlow = shouldUseAdvisorFlow(trimmedInput)

    appendUserMessageWithPlaceholder(userBubbleContent)
    setInput('')
    setIsTyping(true)

    if (attachedFile) {
      const fileToSend = attachedFile
      resetAttachment()
      await sendResumeForFeedback(trimmedInput, fileToSend)
      return
    }

    await sendPromptToChat(trimmedInput, conversationHistory, advisorFlow)
  }

  const sendResumeForFeedback = async (prompt: string, file: File) => {
    if (!userId) {
      setAttachmentError('Sign in to upload a resume for feedback.')
      setAuthPromptVisible(true)
      setIsTyping(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('userId', userId)
      if (conversationId) {
        formData.append('conversationId', conversationId)
      }
      formData.append('file', file)
      if (prompt) {
        formData.append('prompt', prompt)
      }

      const response = await fetch('/api/chat/resume-feedback', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Resume analysis failed')
      }

      const data = await response.json()

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        router.push(`/chat?c=${data.conversationId}`)
      }

      if (typeof data.assistantMessage === 'string') {
        setAssistantMessage({ content: data.assistantMessage })
      } else {
        setAssistantMessage({ content: 'Here is your resume feedback.' })
      }

      // Defer sidebar refresh until the next explicit load (page refresh or new chat)
    } catch (error) {
      const friendly = error instanceof Error ? error.message : 'Unexpected error'
      setAssistantMessage({ content: `Sorry, I ran into an issue reviewing that resume: ${friendly}` })
    } finally {
      setIsTyping(false)
    }
  }

  const sendPromptToChat = async (
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    advisorFlow: boolean
  ) => {
    try {
      const response = await fetch('/api/ai-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: history,
          userMessage: message,
          advisorFlow,
          conversationId,
          userId,
        }),
      })

      if (!response.ok) {
        const statusText = response.statusText || 'Unknown error'
        throw new Error(`Server error (${response.status}): ${statusText}`)
      }

      const data = await response.json()

      if (!data?.ok) {
        throw new Error(data?.error || 'Model response error')
      }

      if (data.parsed && data.raw) {
        setAssistantMessage({ raw: data.raw, advisor: data.parsed })
      } else if (typeof data.message === 'string') {
        setAssistantMessage({ content: data.message, fallback: Boolean(data.fallback) })
      } else {
        setAssistantMessage({
          content: "I'm ready when you are—could you restate that so I can help?",
          fallback: true,
        })
      }

      const nextConvId: string | null = typeof data.conversationId === 'string' ? data.conversationId : conversationId
      if (nextConvId && !conversationId) {
        setConversationId(nextConvId)
        markExistingNavigation()
        pendingConversationIdRef.current = nextConvId
        router.replace(`/chat?c=${nextConvId}`)
      }
    } catch (error) {
      console.error('Chat error:', error)
      const friendly = error instanceof Error ? error.message : 'Unexpected error'
      setAssistantMessage({ content: `Sorry, I encountered an error: ${friendly}` })
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {isAuthenticated ? (
        <div className="border-b border-border bg-card/70 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Mobile Menu Toggle Button */}
              {sidebarContext && (
                <Button
                  data-mobile-menu-button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "flex-shrink-0 md:hidden",
                    "h-9 w-9 rounded-xl",
                    "bg-bg-surface/95 backdrop-blur-sm border border-border/60",
                    "shadow-sm hover:shadow-md",
                    "hover:bg-muted/80 hover:border-border",
                    "active:scale-95",
                    "transition-all duration-200",
                    "text-text-primary"
                  )}
                  onClick={toggleMobileSidebar}
                  aria-label="Toggle sidebar"
                >
                  {isMobileSidebarOpen ? (
                    <X className="h-4 w-4 transition-transform duration-200" />
                  ) : (
                    <Menu className="h-4 w-4 transition-transform duration-200" />
                  )}
                </Button>
              )}
              
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 flex-shrink-0">
                  Logged in
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">Personalized coaching is active.</p>
                  <p className="text-sm text-text-secondary">
                    {conversationContext?.targetRole
                      ? `Working toward ${conversationContext.targetRole}. Ask follow-ups to sharpen the roadmap.`
                      : interestDisplay
                        ? `Lining up ${interestDisplay} opportunities. Pick a target role so I can lock the next moves around it.`
                        : 'Tell me your target role so I can shape the roadmap around it.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col bg-bg relative min-h-0 pb-36 sm:pb-40">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
                  <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-6 rounded-3xl">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-3">
                  Welcome to CareerGuideGPT
                </h2>
                <p className="text-text-secondary mb-8 max-w-md text-lg">
                  Ask me anything about careers, skills, or job opportunities. I'm here to help you discover your path!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  <button
                    onClick={() => handleSeedPrompt("I like coding. What careers?")}
                    className={cn(
                      "group bg-card border border-border p-5 rounded-2xl text-left hover:border-primary/50 hover:shadow-lg transition-all duration-200",
                      "hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-medium text-text-primary group-hover:text-primary transition-colors">
                        I like coding. What careers?
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSeedPrompt("What skills do I need for software engineering?")}
                    className={cn(
                      "group bg-card border border-border p-5 rounded-2xl text-left hover:border-primary/50 hover:shadow-lg transition-all duration-200",
                      "hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-medium text-text-primary group-hover:text-primary transition-colors">
                        What skills do I need for software engineering?
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  const assistantMsg = !isUser ? (msg as AssistantMessage) : null
                  const hasAdvisor = Boolean(assistantMsg?.advisor)
                  const isLastMessage = idx === messages.length - 1
                  const assistantContent = assistantMsg?.content ?? ''
                  const isEmpty = !isUser && !hasAdvisor && !assistantContent.trim()
                  const displayContent = isUser
                    ? msg.content
                    : hasAdvisor
                      ? ''
                      : normalizeAssistantMarkdown(assistantContent)
                  
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-3 group",
                        isUser ? 'justify-end' : 'justify-start',
                        "opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]"
                      )}
                    >
                      {!isUser && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mt-1">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      
                      <div className={cn(
                        "flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]",
                        isUser && 'items-end'
                      )}>
                        <div
                          className={cn(
                            'relative rounded-2xl shadow-sm',
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-br-sm px-4 py-3'
                              : hasAdvisor
                                ? 'bg-transparent border-none px-0 py-0'
                                : 'bg-card text-text-primary border border-border rounded-bl-sm px-4 py-3',
                            !isUser && hasAdvisor ? '' : 'hover:shadow-md transition-shadow duration-200'
                          )}
                        >
                          {isEmpty && isTyping && isLastMessage ? (
                            <div className="flex gap-1 py-1">
                              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          ) : (
                            <>
                              {hasAdvisor ? (
                                <AdvisorCardMinimal data={assistantMsg!.advisor!} />
                              ) : (
                                <div
                                  className={cn(
                                    'text-[15px] leading-relaxed space-y-3 break-words',
                                    isUser ? 'text-primary-foreground' : 'text-text-primary'
                                  )}
                                >
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => (
                                        <h2 className="text-xl font-semibold text-text-primary tracking-tight">
                                          {children}
                                        </h2>
                                      ),
                                      h2: ({ children }) => (
                                        <h3 className="text-lg font-semibold text-text-primary mt-4">
                                          {children}
                                        </h3>
                                      ),
                                      h3: ({ children }) => (
                                        <h4 className="text-base font-semibold text-primary mt-3 flex items-center gap-2">
                                          <span className="inline-flex h-2 w-2 rounded-full bg-primary/70" />
                                          {children}
                                        </h4>
                                      ),
                                      h4: ({ children }) => (
                                        <h5 className="text-sm font-semibold uppercase tracking-wide text-text-secondary mt-3">
                                          {children}
                                        </h5>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-primary/40 pl-4 italic text-text-secondary">
                                          {children}
                                        </blockquote>
                                      ),
                                      table: ({ children }) => (
                                        <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-border/60 bg-card/80">
                                          <table className="min-w-full border-collapse text-sm break-words">{children}</table>
                                        </div>
                                      ),
                                      thead: ({ children }) => (
                                        <thead className="bg-primary/10 text-left text-text-primary uppercase tracking-wide text-xs">
                                          {children}
                                        </thead>
                                      ),
                                      tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
                                      tr: ({ children }) => <tr className="border-b border-border/40 last:border-b-0">{children}</tr>,
                                      th: ({ children }) => (
                                        <th className="px-4 py-3 font-semibold text-text-primary align-top break-words">{children}</th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="px-4 py-3 align-top text-text-secondary break-words">{children}</td>
                                      ),
                                      p: ({ children }) => (
                                        <p className="leading-relaxed whitespace-pre-line break-words">
                                          {children}
                                        </p>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold">
                                          {children}
                                        </strong>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="space-y-3 list-none">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="space-y-3 list-decimal ml-5">
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => (
                                        <li className="relative pl-5">
                                          <span className="absolute left-0 top-2.5 block h-1.5 w-1.5 rounded-full bg-current" />
                                          <span>{children}</span>
                                        </li>
                                      ),
                                      br: () => <br />,
                                    }}
                                  >
                                    {displayContent}
                                  </ReactMarkdown>
                                </div>
                              )}
                              {!isUser && assistantMsg && (assistantMsg.raw ?? assistantMsg.content)?.trim() && (
                                <button
                                  onClick={() => handleCopyMessage(assistantMsg, idx)}
                                  className={cn(
                                    "absolute -top-2 -right-2 p-1.5 rounded-full bg-bg border border-border shadow-sm",
                                    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                                    "hover:bg-muted active:scale-95"
                                  )}
                                  title="Copy message"
                                >
                                  {copiedIndex === idx ? (
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-text-secondary" />
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isUser && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed inset-x-0 md:left-64 bottom-0 z-20 border-t border-border bg-gradient-to-b from-bg via-bg/95 to-bg/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 pb-4 sm:pb-6 pt-3 sm:pt-4">
          <form onSubmit={handleSend} className="relative space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="relative flex-1 group/input">
              <div className="absolute -inset-[1.5px] rounded-[32px] bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 transition-opacity duration-200 group-focus-within/input:opacity-100 group-hover/input:opacity-100" />
              <div
                className={cn(
                  'relative flex w-full items-end gap-3 rounded-[30px] border border-border/60 bg-card/95 px-4 py-3 shadow-[0_12px_45px_-30px_rgba(19,48,112,0.45)] transition-all duration-200',
                  'group-focus-within/input:border-primary/70 group-focus-within/input:shadow-[0_18px_55px_-25px_rgba(33,70,160,0.55)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setAuthPromptVisible(true)
                      setAttachmentError('Sign in to upload a resume for feedback.')
                      return
                    }
                    fileInputRef.current?.click()
                  }}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-text-secondary transition-all duration-200',
                    attachedFile
                      ? 'bg-primary/10 text-primary border-primary/40 shadow-[0_4px_20px_-15px_rgba(33,70,160,0.75)]'
                      : 'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                  )}
                  aria-label="Attach resume"
                >
                  <Paperclip className={cn('h-5 w-5 transition-transform duration-200', attachedFile && 'rotate-12')} />
                </button>

                <div className="flex-1 min-w-0">
                  {attachedFile && (
                    <div className="mb-3 flex items-center justify-between rounded-2xl bg-muted/80 px-3 py-2 text-sm text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span className="max-w-[200px] truncate md:max-w-[260px]">{attachedFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={resetAttachment}
                        className="rounded-full p-1 text-text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label="Remove attached resume"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question, attach a resume, or do both..."
                    disabled={isTyping}
                    rows={1}
                    className={cn(
                      'w-full resize-none border-none bg-transparent px-0 text-base leading-relaxed text-text-primary outline-none',
                      'placeholder:text-text-secondary/70'
                    )}
                    style={{ minHeight: '3.75rem', maxHeight: '12rem' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        const hasText = e.currentTarget.value.trim().length > 0
                        const ready = hasText || !!attachedFile
                        if (isTyping || !ready) {
                          e.preventDefault()
                          return
                        }
                        e.preventDefault()
                        e.currentTarget.closest('form')?.requestSubmit()
                      }
                    }}
                    aria-label="Message input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={(input.trim().length === 0 && !attachedFile) || isTyping}
                  size="lg"
                  className={cn(
                    'group relative h-12 w-12 flex-shrink-0 rounded-2xl p-0',
                    'bg-primary hover:bg-primary/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-200',
                    'hover:translate-y-[-1px] hover:shadow-xl',
                    'shadow-lg'
                  )}
                  aria-label="Send message"
                >
                  {isTyping ? (
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  ) : (
                    <Send className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[3px] group-active:translate-x-[1px]" />
                  )}
                </Button>
              </div>
            </div>

            {attachmentError && (
              <p className="px-1 text-sm text-red-500">{attachmentError}</p>
            )}
            {authPromptVisible && (
              <div className="px-3 py-3 rounded-2xl border border-border bg-card/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">Sign in to access premium tools</p>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1">
                    Upload resumes, save chats, get career matches, and practice interviews with a free account.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  </div>
  )
}

function normalizeAssistantMarkdown(value: string): string {
  if (!value) return value
  let output = value.replace(/\r\n/g, '\n').trim()

  // remove stray dividers or horizontal rules
  output = output.replace(/^\s*[-*]{3,}\s*$/gm, '')

  // ensure core headers have breathing room
  output = output.replace(/(\*\*Key Insights\*\*|\*\*Next Steps\*\*)/gi, '\n\n$1\n\n')
  output = output.replace(/\*\*(Question|Prompt) for you:\*\*/gi, '\n\n**Question for you:**\n\n')

  // provide breathing room between bullet items
  output = output.replace(/\n- /g, '\n\n- ')
  output = output.replace(/\n\*\s/g, '\n\n* ')
  output = output.replace(/\n✅/g, '\n\n✅')

  // collapse excessive newlines, keeping double spacing for clarity
  output = output.replace(/\n{3,}/g, '\n\n')

  // tidy spaces around em dash usage
  output = output.replace(/\s+—\s+/g, ' — ')

  return output.trim()
}
