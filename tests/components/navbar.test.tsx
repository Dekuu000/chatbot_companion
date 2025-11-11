import React from 'react'
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Navbar from '@/components/Navbar'

// Mock next/navigation router hooks
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Mock session utils
vi.mock('@/lib/session', () => ({
	getSession: () => ({ userId: 'user_1', name: 'Demo User', email: 'demo@example.com' }),
	clearSession: () => {},
}))

describe('Navbar', () => {
	it('renders app title', () => {
		render(<Navbar />)
		expect(screen.getByText('Chatbot Companion')).toBeInTheDocument()
	})
})

