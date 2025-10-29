/**
 * Client-side session utilities
 */

export interface UserSession {
  userId: string
  username: string
  email?: string
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null

  const userId = localStorage.getItem('userId')
  const username = localStorage.getItem('username')
  const email = localStorage.getItem('email')

  if (!userId || !username) return null

  return {
    userId,
    username,
    email: email || undefined,
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('email')
}

export function setSession(session: UserSession): void {
  if (typeof window === 'undefined') return

  localStorage.setItem('userId', session.userId)
  localStorage.setItem('username', session.username)
  if (session.email) {
    localStorage.setItem('email', session.email)
  }
}
