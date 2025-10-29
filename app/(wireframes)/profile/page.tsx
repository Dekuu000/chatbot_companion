/**
 * Profile Page Wireframe
 * User profile management with skills, interests, education
 */

'use client'

import { useState } from 'react'
import { HiUserCircle, HiAcademicCap, HiBriefcase, HiHeart } from 'react-icons/hi2'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    educationLevel: 'Bachelor\'s',
    major: 'Computer Science',
    currentYear: 'Junior',
    skills: ['JavaScript', 'Python', 'React'],
    interests: ['Web Development', 'AI/ML'],
    goals: 'Become a full-stack developer at a tech company'
  })

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
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
            <HiUserCircle className="h-8 w-8 mr-3 text-indigo-600" />
            My Profile
          </h1>

          {/* Education Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <HiAcademicCap className="h-6 w-6 mr-2 text-indigo-600" />
              Education
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Education Level
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>High School</option>
                  <option>Bachelor's</option>
                  <option>Master's</option>
                  <option>PhD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Major/Field
                </label>
                <input
                  type="text"
                  value={profile.major}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Year
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>Freshman</option>
                  <option>Sophomore</option>
                  <option>Junior</option>
                  <option>Senior</option>
                  <option>Graduate</option>
                </select>
              </div>
            </div>
          </section>

          {/* Skills Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <HiBriefcase className="h-6 w-6 mr-2 text-indigo-600" />
              Skills
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                >
                  {skill} ×
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add a skill..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </section>

          {/* Interests Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <HiHeart className="h-6 w-6 mr-2 text-indigo-600" />
              Interests
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded-full text-sm"
                >
                  {interest} ×
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add an interest..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </section>

          {/* Goals Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Career Goals
            </h2>
            <textarea
              value={profile.goals}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Describe your career goals..."
            />
          </section>

          {/* Save Button */}
          <button className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
            Save Profile
          </button>
        </div>
      </main>
    </div>
  )
}
