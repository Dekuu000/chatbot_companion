/**
 * Simplified Demo Authentication
 * For production, replace with proper authentication (NextAuth, Auth0, etc.)
 */

import { prisma } from './prisma'

export interface UserSession {
  userId: string
  username: string
  email?: string
}

// Demo login - creates or retrieves a user
export async function demoLogin(username: string): Promise<UserSession> {
  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { username },
  })

  // Create user if doesn't exist (demo mode)
  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        email: null, // Optional for demo
      },
    })
  }

  return {
    userId: user.id,
    username: user.username,
    email: user.email || undefined,
  }
}

// Get user session (for server-side)
export async function getUserSession(userId: string): Promise<UserSession | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return null

  return {
    userId: user.id,
    username: user.username,
    email: user.email || undefined,
  }
}
