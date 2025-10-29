/**
 * Navigation Component with Auth
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HiSparkles } from 'react-icons/hi2'
import { getSession, clearSession } from '@/lib/session'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [session, setSession] = useState<{ userId: string; username: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    setSession(getSession())
  }, [])

  const handleLogout = () => {
    clearSession()
    setSession(null)
    router.push('/login')
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <Link href="/" className="flex items-center">
            <HiSparkles className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
              Chatbot Companion
            </span>
          </Link>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {session.username}
                </span>
                <Link href="/profile" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                  Profile
                </Link>
                <Link href="/chat" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                  Chat
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 dark:text-gray-300 hover:text-indigo-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
