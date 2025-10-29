/**
 * Home Page - Landing page with navigation and feature overview
 */

import Link from 'next/link'
import { HiChatBubbleLeftRight, HiDocumentText, HiUserCircle } from 'react-icons/hi2'
import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            AI-Powered Career Pathway Explorer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover your ideal career path with personalized AI guidance, interview prep, and resume feedback
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Chat Feature */}
          <Link href="/chat" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <HiChatBubbleLeftRight className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              AI Chatbot
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get instant answers about career paths, skills, and opportunities
            </p>
          </Link>

          {/* Career Suggestions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <HiSparkles className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Career Suggestions
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Receive personalized career recommendations based on your profile
            </p>
          </div>

          {/* Resume Review */}
          <Link href="/resume" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <HiDocumentText className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Resume Review
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Upload your resume for AI-powered feedback and career alignment
            </p>
          </Link>

          {/* Interview Prep */}
          <Link href="/interview" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <HiUserCircle className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Interview Prep
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Practice with AI-generated interview questions tailored to your goals
            </p>
          </Link>
        </div>

        {/* CTA Section */}
        <div className="bg-indigo-600 rounded-lg shadow-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to explore your career path?</h2>
          <p className="text-indigo-100 mb-6">Start by setting up your profile or jump into a chat!</p>
          <div className="flex justify-center space-x-4">
            <Link href="/profile" className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition">
              Set Up Profile
            </Link>
            <Link href="/chat" className="bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-800 transition">
              Start Chatting
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
