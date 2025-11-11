import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUserAccount, authenticateUser, __clearFallbackUsers } from '@/lib/auth'

// These tests exercise the fallback in-memory store by mocking prisma failures.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockRejectedValue(new Error('DB unavailable')),
      create: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    },
  },
}))

describe('auth helpers fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __clearFallbackUsers()
  })

  it('creates a new user and authenticates with correct password', async () => {
    const session = await createUserAccount({ email: 'test@example.com', password: 'Password123', name: 'Test User' })
    expect(session.email).toBe('test@example.com')
    expect(session.name).toBe('Test User')

    const authenticated = await authenticateUser({ email: 'test@example.com', password: 'Password123' })
    expect(authenticated?.userId).toBe(session.userId)
  })

  it('fails authentication with wrong password', async () => {
    await createUserAccount({ email: 'another@example.com', password: 'Password123' })
    const result = await authenticateUser({ email: 'another@example.com', password: 'WrongPassword' })
    expect(result).toBeNull()
  })
})


// These tests exercise the fallback in-memory store by mocking prisma failures.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockRejectedValue(new Error('DB unavailable')),
      create: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    },
  },
}))

describe('auth helpers fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __clearFallbackUsers()
  })

  it('creates a new user and authenticates with correct password', async () => {
    const session = await createUserAccount({ email: 'test@example.com', password: 'Password123', name: 'Test User' })
    expect(session.email).toBe('test@example.com')
    expect(session.name).toBe('Test User')

    const authenticated = await authenticateUser({ email: 'test@example.com', password: 'Password123' })
    expect(authenticated?.userId).toBe(session.userId)
  })

  it('fails authentication with wrong password', async () => {
    await createUserAccount({ email: 'another@example.com', password: 'Password123' })
    const result = await authenticateUser({ email: 'another@example.com', password: 'WrongPassword' })
    expect(result).toBeNull()
  })
})


