import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromResumeFile } from '@/lib/pdf-extractor'

// Force dynamic rendering - this route should not be statically analyzed during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handleUpload(request: NextRequest) {
  // Lazy import to prevent Prisma initialization during build
  const { prisma } = await import('@/lib/prisma')
  
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]

  if (!supportedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Upload a PDF, DOCX, or plain text resume.' },
      { status: 400 }
    )
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const extractedText = await extractTextFromResumeFile(buffer, file.type)

  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: file.name,
      fileData: buffer,
      fileSize: file.size,
      mimeType: file.type,
      extractedText,
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
    },
  })

  return NextResponse.json(
    {
      ...resume,
      message: 'Resume uploaded successfully',
    },
    { status: 200 }
  )
}

// Export handler directly to avoid build-time analysis of secureRoute wrapper
export async function POST(request: NextRequest) {
  // Lazy import secureRoute to prevent any build-time analysis
  const { secureRoute } = await import('@/lib/middleware/route-guards')
  const handler = secureRoute(handleUpload)
  return handler(request)
}




