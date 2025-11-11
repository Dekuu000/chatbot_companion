/**
 * Client-side session utilities
 *
 * These helpers centralise the notion of the current session so the UI can
 * distinguish between authenticated and guest experiences. Authenticated users
 * persist to localStorage, while guests remain ephemeral (sessionStorage or
 * in-memory fallback).
 */

const AUTH_STORAGE_KEY = 'career.auth.session'
const LEGACY_KEYS = ['userId', 'name', 'email'] as const
const GUEST_STORAGE_KEY = 'career.guest.session'

export type SessionMode = 'guest' | 'authenticated'

export interface UserSession {
  userId: string
  email?: string
  name?: string
  provider?: string
}

export interface SessionState {
  mode: SessionMode
  user: UserSession | null
  guestId?: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readParsedSession(raw: string | null): UserSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const userId = typeof parsed.userId === 'string' && parsed.userId ? parsed.userId : undefined
    if (!userId) return null
    return {
      userId,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      provider: typeof parsed.provider === 'string' ? parsed.provider : undefined,
    }
  } catch {
    return null
  }
}

function readLegacySession(storage: Storage): UserSession | null {
  const userId = storage.getItem('userId') ?? undefined
  const email = storage.getItem('email') ?? undefined
  if (!userId && !email) return null

  if (!userId) return null

  return {
    userId,
    email,
    name: storage.getItem('name') ?? undefined,
  }
}

function getSessionStorage(): Storage | null {
  if (!isBrowser()) return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function getGuestStore(): { get: () => string | null; set: (value: string) => void; clear: () => void } | null {
  const storage = getSessionStorage()
  if (storage) {
    return {
      get: () => storage.getItem(GUEST_STORAGE_KEY),
      set: (value: string) => storage.setItem(GUEST_STORAGE_KEY, value),
      clear: () => storage.removeItem(GUEST_STORAGE_KEY),
    }
  }

  if (!isBrowser()) return null

  const globalKey = '__career_guest_session__'
  const globalHost = window as unknown as Record<string, string | undefined>
  return {
    get: () => globalHost[globalKey] ?? null,
    set: (value: string) => {
      globalHost[globalKey] = value
    },
    clear: () => {
      delete globalHost[globalKey]
    },
  }
}

function ensureGuestId(): string {
  if (!isBrowser()) {
    return 'guest'
  }

  const store = getGuestStore()
  if (!store) return 'guest'

  const existing = store.get()
  if (existing) return existing

  let generated = ''
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    generated = `guest_${crypto.randomUUID()}`
  } else {
    generated = `guest_${Math.random().toString(36).slice(2, 10)}`
  }
  store.set(generated)
  return generated
}

function readStoredSession(): UserSession | null {
  if (!isBrowser()) return null
  const storage = window.localStorage
  const parsed = readParsedSession(storage.getItem(AUTH_STORAGE_KEY))
  if (parsed) return parsed

  return readLegacySession(storage)
}

/**
 * Legacy helper returning raw authenticated identity (if present).
 * Returns null for guests.
 */
export function getSession(): UserSession | null {
  return readStoredSession()
}

/**
 * Rich session state describing whether the current visitor is a guest.
 */
export function getClientSessionState(): SessionState {
  const identity = readStoredSession()
  if (identity) {
    return {
      mode: 'authenticated',
      user: identity,
    }
  }

  return {
    mode: 'guest',
    user: null,
    guestId: ensureGuestId(),
  }
}

export function setSession(session: UserSession): void {
  if (!isBrowser()) return

  const storage = window.localStorage
  const payload = JSON.stringify({
    userId: session.userId,
    email: session.email ?? null,
    name: session.name ?? null,
    provider: session.provider ?? null,
  })

  storage.setItem(AUTH_STORAGE_KEY, payload)

  // Maintain legacy keys temporarily for backwards compatibility.
  storage.setItem('userId', session.userId)
  if (session.name) {
    storage.setItem('name', session.name)
  } else {
    storage.removeItem('name')
  }
  if (session.email) {
    storage.setItem('email', session.email)
  } else {
    storage.removeItem('email')
  }

  const guestStore = getGuestStore()
  guestStore?.clear()
}

export function clearSession(): void {
  if (!isBrowser()) return
  const storage = window.localStorage
  storage.removeItem(AUTH_STORAGE_KEY)
  for (const key of LEGACY_KEYS) {
    storage.removeItem(key)
  }

  const guestStore = getGuestStore()
  guestStore?.clear()
}

export function refreshSessionState(): SessionState {
  return getClientSessionState()
}

export function getGuestSessionId(): string {
  return ensureGuestId()
}
