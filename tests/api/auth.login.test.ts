// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

const hashed = bcrypt.hashSync('Secret123', 10)

vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(async ({ where: { email } }: any) => {
				if (email === 'valid@example.com') {
					return { id: 'user_1', email, passwordHash: hashed, name: 'Demo User' }
				}
				return null
			}),
			create: vi.fn(),
		},
	},
}))

// Load the route after mocks
import * as loginRoute from '@/app/api/auth/login/route'

const { prisma } = await import('@/lib/prisma') as any

const findUniqueMock = prisma.user.findUnique as ReturnType<typeof vi.fn>

describe('POST /api/auth/login (integration style)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when credentials are invalid', async () => {
		findUniqueMock.mockResolvedValueOnce(null)
		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'missing@example.com', password: 'WrongPass' }),
		})

		const res: Response = (await (loginRoute as any).POST(req)) as Response
		expect(res.status).toBe(401)
	})

	it('returns 200 when credentials are valid', async () => {
		findUniqueMock.mockResolvedValueOnce({ id: 'user_1', email: 'valid@example.com', passwordHash: hashed, name: 'Demo User' })

		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'valid@example.com', password: 'Secret123' }),
		})

		const res: Response = (await (loginRoute as any).POST(req)) as Response
		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.session).toEqual({ userId: 'user_1', email: 'valid@example.com', name: 'Demo User' })
	})
})

		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'valid@example.com', password: 'Secret123' }),
		})

		const res: Response = (await (loginRoute as any).POST(req)) as Response
		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.session).toEqual({ userId: 'user_1', email: 'valid@example.com', name: 'Demo User' })
	})
})
