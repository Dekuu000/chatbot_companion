/**
 * Profile utilities - Auto-create profile on first access
 */

import { prisma } from './prisma'

export async function ensureProfile(userId: string) {
  // Check if profile exists
  let profile = await prisma.profile.findUnique({
    where: { userId },
  })

  // Auto-create if doesn't exist
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId,
        skills: '[]',
        interests: '[]',
      },
    })
  }

  return profile
}
