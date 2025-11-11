'use client'

import Link from 'next/link'
import { HiSparkles } from 'react-icons/hi2'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '@/components/providers/session-provider'

export default function Navbar() {
  const { state, status, signOut } = useSessionContext()
  const router = useRouter()

  const isAuthenticated = state.mode === 'authenticated'
  const displayName = state.user?.name || state.user?.email || 'Welcome'

  const handleLogout = () => {
    signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <Link href="/" className="flex items-center">
            <HiSparkles className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Chatbot Companion</span>
          </Link>
          <div className="flex items-center space-x-4">
            {status === 'ready' && isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">{displayName}</span>
                <Link href="/profile" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                  Profile
                </Link>
                <Link href="/chat" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                  Chat
                </Link>
                <button onClick={handleLogout} className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Guest mode
                </div>
                <Link href="/login" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                  Login
                </Link>
                <Link href="/signup" className="text-indigo-600 hover:text-indigo-500">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
