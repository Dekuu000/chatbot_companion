import { randomUUID } from 'crypto'

type MemoryMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

type MemoryConversation = {
  id: string
  userId: string
  title: string | null
  archived: boolean
  messageCount: number
  lastMessageAt: string
  contextTags: string | null
  messages: MemoryMessage[]
}

type ConversationUpdate = Partial<Pick<MemoryConversation, 'title' | 'archived' | 'contextTags' | 'lastMessageAt' | 'messageCount'>>

const GLOBAL_KEY = '__memory_conversation_store__'

const globalStore = (globalThis as unknown as Record<string, Map<string, MemoryConversation> | undefined>)[GLOBAL_KEY]

const STORE: Map<string, MemoryConversation> = globalStore ?? new Map()

if (!globalStore) {
  ;(globalThis as unknown as Record<string, Map<string, MemoryConversation>>)[GLOBAL_KEY] = STORE
}

function generateId(prefix: string) {
  try {
    return `${prefix}_${randomUUID()}`
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 12)}`
  }
}

export function memoryCreateConversation(userId: string, title: string | null): MemoryConversation {
  const now = new Date().toISOString()
  const conversation: MemoryConversation = {
    id: generateId('memconv'),
    userId,
    title,
    archived: false,
    messageCount: 0,
    lastMessageAt: now,
    contextTags: null,
    messages: [],
  }
  STORE.set(conversation.id, conversation)
  return conversation
}

export function memoryUpdateConversation(conversationId: string, patch: ConversationUpdate): MemoryConversation | null {
  const existing = STORE.get(conversationId)
  if (!existing) return null
  Object.assign(existing, patch)
  return existing
}

export function memoryListConversations(userId: string) {
  return Array.from(STORE.values())
    .filter((conversation) => conversation.userId === userId && !conversation.archived)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      contextTags: conversation.contextTags,
    }))
}

export function memoryGetConversation(conversationId: string): MemoryConversation | null {
  return STORE.get(conversationId) ?? null
}

export function memoryAddMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const conversation = STORE.get(conversationId)
  if (!conversation) return null
  const message: MemoryMessage = {
    id: generateId('memmsg'),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
  conversation.messages.push(message)
  conversation.messageCount += 1
  conversation.lastMessageAt = message.createdAt
  return message
}

export function memoryListMessages(conversationId: string) {
  const conversation = STORE.get(conversationId)
  if (!conversation) return null
  return {
    conversation,
    messages: conversation.messages.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }
}

