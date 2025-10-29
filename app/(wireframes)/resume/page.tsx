/**
 * Resume Review Page Wireframe
 * Upload and analyze real PDF resumes with AI
 */

'use client'

import { useState } from 'react'
import { HiDocumentArrowUp, HiSparkles, HiCheckCircle } from 'react-icons/hi2'
import Link from 'next/link'

export default function ResumeReviewPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
    }
  }

  const handleAnalyze = () => {
    if (!uploadedFile) return
    setIsAnalyzing(true)
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false)
      setAnalysisComplete(true)
    }, 2000)
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Resume Review & Analysis
        </h1>

        {!analysisComplete ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center mb-6">
              <HiDocumentArrowUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Upload Your Resume (PDF)
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Drag and drop your PDF resume here, or click to select
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-indigo-700 transition"
              >
                Select PDF File
              </label>
              {uploadedFile && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>

            {/* Analyze Button */}
            {uploadedFile && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isAnalyzing ? (
                  <>
                    <HiSparkles className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing Resume...
                  </>
                ) : (
                  <>
                    <HiSparkles className="h-5 w-5 mr-2" />
                    Analyze Resume with AI
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analysis Results */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-6">
                <HiCheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Analysis Complete
                </h2>
              </div>

              {/* Overall Score */}
              <div className="bg-indigo-50 dark:bg-indigo-900 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Overall Score
                  </span>
                  <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    85/100
                  </span>
                </div>
              </div>

              {/* Career Alignment */}
              <section className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Career Alignment
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300">
                    Your resume aligns well with roles in Software Engineering, Full-Stack Development, 
                    and Frontend Development. Strong match with JavaScript and React skills.
                  </p>
                </div>
              </section>

              {/* Improvement Suggestions */}
              <section className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Improvement Suggestions
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Add quantifiable achievements to your work experience
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Include relevant projects with technologies used
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Highlight leadership or collaboration experiences
                    </span>
                  </li>
                </ul>
              </section>

              {/* Skills Analysis */}
              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Skills Identified
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['JavaScript', 'React', 'Node.js', 'Python', 'Git'].map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            {/* Upload New Button */}
            <button
              onClick={() => {
                setUploadedFile(null)
                setAnalysisComplete(false)
              }}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Upload Another Resume
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
