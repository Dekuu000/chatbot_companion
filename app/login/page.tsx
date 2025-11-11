/**
 * Demo Login Page
 */

"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HiSparkles } from 'react-icons/hi2'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useSessionContext } from '@/components/providers/session-provider'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuthenticatedSession, state: sessionState, status: sessionStatus } = useSessionContext()
  const redirectParam = searchParams.get('redirect')
  const redirect = redirectParam && redirectParam.startsWith('/chat') ? redirectParam : '/chat'
  const isSessionReady = sessionStatus === 'ready'
  const isAuthenticated = sessionState.mode === 'authenticated'
  const checkingSession = useMemo(() => !isSessionReady || isAuthenticated, [isAuthenticated, isSessionReady])

  useEffect(() => {
    if (!isSessionReady) return
    if (!isAuthenticated) return
    router.replace(redirect)
  }, [isAuthenticated, isSessionReady, redirect, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      setAuthenticatedSession({
        userId: data.session.userId,
        email: data.session.email,
        name: data.session.name,
      })

      router.replace(redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    checkingSession ? (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="text-gray-600 dark:text-gray-300">Preparing sign-in…</div>
      </div>
    ) : (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <HiSparkles className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-600 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Sign in with your email and password to continue exploring careers.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
          {error && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need an account?{' '}
            <Link href="/signup" className="text-indigo-600 hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  ))
}
