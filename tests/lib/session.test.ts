import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getSession, setSession, clearSession } from '@/lib/session'

const createLocalStorageMock = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    _store: store,
  }
}

describe('session storage helpers', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    vi.stubGlobal('window', { localStorage: localStorageMock })
    clearSession()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists session data and retrieves it', () => {
    setSession({ userId: 'user-1', name: 'Career Fan', email: 'careerfan@example.com' })
    const session = getSession()
    expect(session).toEqual({ userId: 'user-1', name: 'Career Fan', email: 'careerfan@example.com' })
  })

  it('clearSession removes all stored credentials', () => {
    setSession({ userId: 'user-2', name: 'Test', email: 'test@example.com' })
    expect(getSession()).not.toBeNull()
    clearSession()
    expect(getSession()).toBeNull()
    expect(localStorageMock._store.size).toBe(0)
  })

  it('getSession returns null when nothing stored', () => {
    clearSession()
    const session = getSession()
    expect(session).toBeNull()
  })
})


const createLocalStorageMock = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    _store: store,
  }
}

describe('session storage helpers', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    vi.stubGlobal('window', { localStorage: localStorageMock })
    clearSession()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists session data and retrieves it', () => {
    setSession({ userId: 'user-1', name: 'Career Fan', email: 'careerfan@example.com' })
    const session = getSession()
    expect(session).toEqual({ userId: 'user-1', name: 'Career Fan', email: 'careerfan@example.com' })
  })

  it('clearSession removes all stored credentials', () => {
    setSession({ userId: 'user-2', name: 'Test', email: 'test@example.com' })
    expect(getSession()).not.toBeNull()
    clearSession()
    expect(getSession()).toBeNull()
    expect(localStorageMock._store.size).toBe(0)
  })

  it('getSession returns null when nothing stored', () => {
    clearSession()
    const session = getSession()
    expect(session).toBeNull()
  })
})


