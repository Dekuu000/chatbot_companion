/**
 * Simplified Demo Authentication
 * For production, replace with proper authentication (NextAuth, Auth0, etc.)
 */

import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export interface UserSession {
  userId: string
  email: string
  name?: string
}

interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  passwordHash?: string | null
  username?: string | null
}

const FALLBACK_GLOBAL_KEY = '__career_auth_fallback__'
const existingStore = (globalThis as Record<string, any>)[FALLBACK_GLOBAL_KEY] as
  | Map<string, { passwordHash: string; name?: string; userId: string; email: string }>
  | undefined

const FALLBACK_STORE: Map<string, { passwordHash: string; name?: string; userId: string; email: string }> =
  existingStore || new Map()

if (!existingStore) {
  ;(globalThis as Record<string, any>)[FALLBACK_GLOBAL_KEY] = FALLBACK_STORE
}

export function __clearFallbackUsers() {
  FALLBACK_STORE.clear()
}

const BCRYPT_ROUNDS = 10

function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function deriveDisplayName(email: string, name?: string): string | undefined {
  if (name && name.trim()) return name.trim()
  const local = email.split('@')[0]
  if (!local) return undefined
  return local
    .replace(/[^a-zA-Z0-9._-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function createUserAccount({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name?: string
}): Promise<UserSession> {
  const normalisedEmail = normaliseEmail(email)
  const displayName = deriveDisplayName(normalisedEmail, name)
  const passwordHash = await hashPassword(password)

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } })
    if (existing) {
      if (existing.passwordHash) {
        throw new Error('Account already exists for this email')
      }

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          username: displayName ?? existing.username ?? deriveDisplayName(normalisedEmail) ?? undefined,
        },
      })

      return {
        userId: updated.id,
        email: normalisedEmail,
        name: updated.username ?? displayName,
      }
    }

    const created = await prisma.user.create({
      data: {
        email: normalisedEmail,
        username: displayName,
        passwordHash,
      },
    })

    return {
      userId: created.id,
      email: normalisedEmail,
      name: created.username ?? displayName,
    }
  } catch (error) {
    console.warn('Using fallback signup flow:', error instanceof Error ? error.message : 'unknown error')

    const fallbackUser = FALLBACK_STORE.get(normalisedEmail)
    if (fallbackUser) {
      fallbackUser.passwordHash = passwordHash
      fallbackUser.name = displayName ?? fallbackUser.name
      return {
        userId: fallbackUser.userId,
        email: normalisedEmail,
        name: fallbackUser.name,
      }
    }

    const userId = `demo_${Buffer.from(normalisedEmail).toString('base64').slice(0, 16)}`
    FALLBACK_STORE.set(normalisedEmail, { passwordHash, name: displayName, userId, email: normalisedEmail })

    return {
      userId,
      email: normalisedEmail,
      name: displayName,
    }
  }
}

export async function authenticateUser({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<UserSession | null> {
  const normalisedEmail = normaliseEmail(email)

  try {
    const user = (await prisma.user.findUnique({ where: { email: normalisedEmail } })) as AuthenticatedUser | null
    if (!user) return null

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return null

    return {
      userId: user.id,
      email: normalisedEmail,
      name: user.name || user.username || undefined,
    }
  } catch (error) {
    console.warn('Using fallback login flow:', error instanceof Error ? error.message : 'unknown error')

    const fallbackUser = FALLBACK_STORE.get(normalisedEmail)
    if (!fallbackUser) return null

    const valid = await verifyPassword(password, fallbackUser.passwordHash)
    if (!valid) return null

    return {
      userId: fallbackUser.userId,
      email: normalisedEmail,
      name: fallbackUser.name,
    }
  }
}

export async function getUserSession(userId: string): Promise<UserSession | null> {
  try {
    const user = (await prisma.user.findUnique({ where: { id: userId } })) as AuthenticatedUser | null
    if (!user) return null
    return {
      userId: user.id,
      email: user.email,
      name: user.name || user.username || undefined,
    }
  } catch (error) {
    console.warn('Database unavailable for getUserSession:', error instanceof Error ? error.message : 'unknown error')
    for (const [, fallbackUser] of FALLBACK_STORE) {
      if (fallbackUser.userId === userId) {
        return {
          userId: fallbackUser.userId,
          email: fallbackUser.email,
          name: fallbackUser.name,
        }
      }
    }
    return null
  }
}
