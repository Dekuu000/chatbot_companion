import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromResumeFile } from '@/lib/pdf-extractor'
import { prisma } from '@/lib/prisma'
import { secureRoute } from '@/lib/middleware/route-guards'

async function handleUpload(request: NextRequest) {
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

export const POST = secureRoute(handleUpload)




