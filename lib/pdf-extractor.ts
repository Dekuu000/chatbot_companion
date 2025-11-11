/**
 * PDF Text Extraction Utility
 */

import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const DOCX_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer)
    return data.text || ''
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

export async function extractTextFromResumeFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer)
  }

  if (mimeType === 'text/plain') {
    return buffer.toString('utf8')
  }

  if (DOCX_MIME_TYPES.includes(mimeType)) {
    try {
      const { value } = await mammoth.extractRawText({ buffer })
      return value || ''
    } catch (error) {
      console.error('DOCX extraction error:', error)
      throw new Error('Failed to extract text from DOCX resume')
    }
  }

  throw new Error('Unsupported resume file type')
}

