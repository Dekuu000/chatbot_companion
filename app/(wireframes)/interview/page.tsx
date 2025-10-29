/**
 * Interview Prep Page Wireframe
 * Generate and practice with AI interview questions
 */

'use client'

import { useState } from 'react'
import { HiSparkles, HiMicrophone, HiLightBulb } from 'react-icons/hi2'
import Link from 'next/link'

export default function InterviewPrepPage() {
  const [questions, setQuestions] = useState<Array<{
    question: string
    difficulty: string
    guidelines: string
    userAnswer: string
  }>>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium')
  const [jobTitle, setJobTitle] = useState('')

  const handleGenerate = () => {
    if (!jobTitle.trim()) return
    
    setIsGenerating(true)
    // Simulate generation
    setTimeout(() => {
      setQuestions([
        {
          question: 'Tell me about yourself and why you\'re interested in this role.',
          difficulty: 'Easy',
          guidelines: 'Focus on your relevant experience and passion for the field. Keep it concise and professional.',
          userAnswer: ''
        },
        {
          question: 'Describe a challenging project you worked on and how you overcame obstacles.',
          difficulty: 'Medium',
          guidelines: 'Use the STAR method: Situation, Task, Action, Result. Be specific about your role.',
          userAnswer: ''
        },
        {
          question: 'How do you handle conflicting priorities and tight deadlines?',
          difficulty: 'Medium',
          guidelines: 'Provide a concrete example showing your time management and problem-solving skills.',
          userAnswer: ''
        }
      ])
      setIsGenerating(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Chatbot Companion
              </span>
            </Link>
            <div className="flex space-x-4">
              <Link href="/chat" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                Chat
              </Link>
              <Link href="/profile" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Interview Preparation Tool
        </h1>

        {questions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title / Position
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Level
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!jobTitle.trim() || isGenerating}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <HiSparkles className="h-5 w-5 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <HiSparkles className="h-5 w-5 mr-2" />
                  Generate Interview Questions
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Question {idx + 1}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    q.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {q.difficulty}
                  </span>
                </div>

                <p className="text-gray-900 dark:text-white mb-4 text-lg">
                  {q.question}
                </p>

                <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <HiLightBulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                        Answer Guidelines
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {q.guidelines}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Answer
                  </label>
                  <textarea
                    value={q.userAnswer}
                    onChange={(e) => {
                      const updated = [...questions]
                      updated[idx].userAnswer = e.target.value
                      setQuestions(updated)
                    }}
                    rows={5}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center">
                  <HiMicrophone className="h-4 w-4 mr-2" />
                  Get AI Feedback
                </button>
              </div>
            ))}

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setQuestions([])
                  setJobTitle('')
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Generate New Questions
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
