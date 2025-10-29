/**
 * Chat Page Wireframe
 * AI chatbot interface with streaming responses
 */

'use client'

import { useState } from 'react'
import { HiArrowUp, HiSparkles, HiMenu } from 'react-icons/hi2'
import Link from 'next/link'

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate typing indicator
    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'This is a wireframe. AI responses will stream here in the full implementation.'
      }])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <HiSparkles className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                CareerGuideGPT
              </span>
            </Link>
            <Link href="/profile" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
              Profile
            </Link>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <HiSparkles className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to CareerGuideGPT
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Ask me anything about careers, skills, or job opportunities. I'm here to help!
              </p>
              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => setInput("I like coding. What careers?")}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-left hover:shadow-md transition"
                >
                  <p className="font-medium text-gray-900 dark:text-white">I like coding. What careers?</p>
                </button>
                <button
                  onClick={() => setInput("What skills do I need for software engineering?")}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-left hover:shadow-md transition"
                >
                  <p className="font-medium text-gray-900 dark:text-white">What skills do I need for software engineering?</p>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about careers, skills, or opportunities..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <HiArrowUp className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
