// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  authenticateUser: vi.fn(async ({ email, password }: { email: string; password: string }) => {
    if (email === 'valid@example.com' && password === 'Secret123') {
      return { userId: 'user_1', email, name: 'Valid User' }
    }
    return null
  }),
}))

import { POST } from '@/app/api/auth/login/route'
import { authenticateUser } from '@/lib/auth'

const mockedAuth = authenticateUser as unknown as ReturnType<typeof vi.fn>

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when email or password is missing', async () => {
    const req: any = { json: async () => ({ email: 'test@example.com' }) }
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for invalid credentials', async () => {
    const req: any = { json: async () => ({ email: 'invalid@example.com', password: 'wrong' }) }
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('logs in and returns a session for valid credentials', async () => {
    const req: any = { json: async () => ({ email: 'valid@example.com', password: 'Secret123' }) }
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session).toEqual({ userId: 'user_1', email: 'valid@example.com', name: 'Valid User' })
    expect(mockedAuth).toHaveBeenCalledWith({ email: 'valid@example.com', password: 'Secret123' })
  })
})












vi.mock('@/lib/auth', () => ({
  authenticateUser: vi.fn(async ({ email, password }: { email: string; password: string }) => {
    if (email === 'valid@example.com' && password === 'Secret123') {
      return { userId: 'user_1', email, name: 'Valid User' }
    }
    return null
  }),
}))

import { POST } from '@/app/api/auth/login/route'
import { authenticateUser } from '@/lib/auth'

const mockedAuth = authenticateUser as unknown as ReturnType<typeof vi.fn>

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when email or password is missing', async () => {
    const req: any = { json: async () => ({ email: 'test@example.com' }) }
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for invalid credentials', async () => {
    const req: any = { json: async () => ({ email: 'invalid@example.com', password: 'wrong' }) }
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('logs in and returns a session for valid credentials', async () => {
    const req: any = { json: async () => ({ email: 'valid@example.com', password: 'Secret123' }) }
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session).toEqual({ userId: 'user_1', email: 'valid@example.com', name: 'Valid User' })
    expect(mockedAuth).toHaveBeenCalledWith({ email: 'valid@example.com', password: 'Secret123' })
  })
})












