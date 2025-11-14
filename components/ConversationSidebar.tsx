'use client'

import { useEffect, useState, useCallback, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Plus, Trash2, MessageSquare, FileText, GraduationCap, LogOut, ChevronDown, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSessionContext } from '@/components/providers/session-provider'

interface ConversationSidebarProps {
  onClose?: () => void
}

export default function ConversationSidebar({ onClose }: ConversationSidebarProps) {
  const { state, signOut } = useSessionContext()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsKey = searchParams?.toString?.() ?? ''
  const router = useRouter()

  const isAuthenticated = state.mode === 'authenticated'
  const session = state.user
  const markExistingNavigation = useCallback(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('chat:navigate', 'existing')
  }, [])

  useEffect(() => {
    if (!session?.userId) {
      setConversations([])
      setLoading(false)
      return
    }

    let cancelled = false

    const loadConversations = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/conversations?userId=${session.userId}`, {
          cache: 'no-store',
          headers: {
            'x-user-id': session.userId,
            'cache-control': 'no-cache',
          },
          credentials: 'include',
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          const list = Array.isArray(data.conversations) ? data.conversations : []
          const recent = list
            .filter((item: any) => (item?.messageCount ?? 0) > 0)
            .map((item: any) => {
              const rawTitle = typeof item?.title === 'string' ? item.title.trim() : ''
              const rawPreview = typeof item?.preview === 'string' ? item.preview.trim() : ''
              const hasMeaningfulTitle = rawTitle.length > 0 && rawTitle.toLowerCase() !== 'new chat'
              return {
                ...item,
                preview: hasMeaningfulTitle ? rawTitle : rawPreview || 'New chat',
              }
            })
          setConversations(recent)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch conversations:', error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [session?.userId, pathname, searchParamsKey])

  if (!isAuthenticated || !session) {
    return (
      <aside className="h-full w-72 flex-shrink-0 border-r border-border bg-bg-surface">
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Save your progress</p>
            <p className="mt-1 text-sm text-text-secondary">
              Sign in to access the conversation explorer and keep your history.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-muted"
          >
            Back to Career Explorer
          </Link>
        </div>
      </aside>
    )
  }

  const handleLogout = () => {
    signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Sparkles },
    { href: '/resume', label: 'Resume', icon: FileText },
    { href: '/interview', label: 'Interview', icon: GraduationCap },
  ]

  const handleNewConversation = async () => {
    if (creating || !session?.userId) return
    setCreating(true)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.userId,
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || 'Failed to start a new conversation')
      }

      const data = await response.json()
      const conversation = data?.conversation
      if (conversation?.id) {
        markExistingNavigation()
        router.push(`/chat?c=${conversation.id}`)
        router.refresh()
      }
    } catch (error) {
      console.error('create_conversation_error', error)
      alert(error instanceof Error ? error.message : 'Unable to start a new chat right now.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteConversation = async (conversation: any) => {
    if (!conversation?.id || !session?.userId) return
    const conversationId = conversation.id as string

    try {
      setDeletingId(conversationId)

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': session.userId,
        },
      })

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete conversation')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('Failed to delete conversation')
    } finally {
      setDeletingId(null)
    }
  }
  const openDeleteModal = (conversation: any, e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTarget(conversation)
  }

  const closeDeleteModal = () => {
    setDeletingId(null)
    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await handleDeleteConversation(deleteTarget)
      const currentId = searchParams?.get?.('c')
      if (pathname === '/chat' && currentId === deleteTarget.id) {
        router.replace('/chat')
        router.refresh()
      }
    } finally {
      closeDeleteModal()
    }
  }

  return (
    <aside className="h-full max-h-screen flex flex-col bg-bg-surface border-r border-border w-full md:w-72 overflow-hidden">
      <div className="flex-shrink-0 p-2 sm:p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Link href="/" onClick={() => onClose?.()} className="group flex flex-1 items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-text-primary transition-colors group-hover:text-primary">
              Career Explorer
            </span>
            <ChevronDown className="ml-auto h-4 w-4 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 flex-shrink-0 md:hidden",
                "rounded-lg",
                "hover:bg-muted"
              )}
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4 text-text-secondary" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 p-3 border-b border-border">
        <Button
          onClick={() => {
            handleNewConversation()
            onClose?.()
          }}
          className="w-full justify-start gap-2 bg-bg text-text-primary font-medium hover:bg-muted"
          variant="ghost"
          disabled={creating}
        >
          <Plus className="h-4 w-4" />
          {creating ? 'Starting…' : 'New chat'}
        </Button>
      </div>

      <div className="flex-shrink-0 px-2 sm:px-3 py-2 border-b border-border">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 px-2 sm:px-3 py-2">
          <h2 className="px-2 sm:px-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Recent</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-3 pb-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="px-3 py-2 text-xs text-text-secondary">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">No conversations yet</div>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => {
                const currentConversationId = searchParams?.get?.('c') ?? null
                const isActive = pathname === '/chat' && currentConversationId === conversation.id
                return (
                  <li key={conversation.id} className="group">
                    <div className="flex items-center gap-1">
                           <Link
                        href={`/chat?c=${conversation.id}`}
                             onClick={() => {
                               markExistingNavigation()
                               onClose?.()
                             }}
                        className={cn(
                          'flex-1 truncate rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                        )}
                      >
                        <MessageSquare className="mr-2 inline h-3.5 w-3.5 opacity-50" />
                        {conversation.preview || 'New chat'}
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 flex-shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(event) => openDeleteModal(conversation, event)}
                        disabled={deletingId === conversation.id}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-text-secondary hover:text-destructive" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border p-2 sm:p-3">
        <div className="group flex items-center gap-1">
          <Link href="/profile" onClick={() => onClose?.()} className="flex flex-1 items-center gap-2 sm:gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted min-w-0">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs sm:text-sm font-semibold text-primary">
              {(session.name || session.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs sm:text-sm font-medium text-text-primary">{session.name || session.email || 'User'}</div>
              {session.email ? <div className="truncate text-[10px] sm:text-xs text-text-secondary">{session.email}</div> : null}
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 w-8 flex-shrink-0 p-0 -ml-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 text-text-secondary" />
          </Button>
        </div>
      </div>
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 md:left-64 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text-primary">Delete conversation?</h3>
            <p className="mt-2 text-sm text-text-secondary">
              This action will permanently remove “{deleteTarget.preview || 'New chat'}”.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeDeleteModal} disabled={deletingId === deleteTarget.id}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                disabled={deletingId === deleteTarget.id}
              >
                {deletingId === deleteTarget.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}






