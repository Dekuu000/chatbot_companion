import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromResumeFile } from '@/lib/pdf-extractor'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SUPPORTED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

const MAX_RESUME_SIZE = 10 * 1024 * 1024 // 10MB

async function handleSuggest(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''

  let query: string | undefined
  let resumeText: string | undefined

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const queryValue = formData.get('query')
      if (typeof queryValue === 'string' && queryValue.trim().length > 0) {
        query = queryValue.trim()
      }

      const resumeFile = formData.get('resume')
      if (resumeFile instanceof File) {
        if (!SUPPORTED_RESUME_TYPES.has(resumeFile.type)) {
          return NextResponse.json(
            { error: 'Unsupported resume type. Upload a PDF, DOCX, or TXT file.' },
            { status: 400 }
          )
        }

        if (resumeFile.size > MAX_RESUME_SIZE) {
          return NextResponse.json({ error: 'Resume must be smaller than 10MB.' }, { status: 400 })
        }

        const buffer = Buffer.from(await resumeFile.arrayBuffer())
        resumeText = await extractTextFromResumeFile(buffer, resumeFile.type)
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null)
      if (body && typeof body.query === 'string' && body.query.trim().length > 0) {
        query = body.query.trim()
      }
      if (body && typeof body.resumeText === 'string' && body.resumeText.trim().length > 0) {
        resumeText = body.resumeText.trim()
      }
    }
  } catch (error) {
    console.error('career_suggest_payload_error', error)
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
  }

  try {
    // Lazy import to prevent Prisma initialization during build
    const { careerService } = await import('@/lib/services/career.service')
    // Delegates to the AI-only pipeline (no static suggestions). Any errors bubble up so the UI can prompt a retry.
    const suggestions = await careerService.suggestCareers(userId, query, resumeText)
    return NextResponse.json({ suggestions }, { status: 200 })
  } catch (error) {
    console.error('career_suggest_generation_error', error)
    return NextResponse.json(
      { error: 'Unable to generate career suggestions right now. Please try again shortly.' },
      { status: 500 }
    )
  }
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute and rateLimit to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const { rateLimit, RATE_LIMITS } = await import('@/lib/middleware/rate-limit')
  const handler = secureRoute(handleSuggest, {
    middlewares: [rateLimit(RATE_LIMITS.CAREER_SUGGESTIONS)],
  })
  return handler(request)
}