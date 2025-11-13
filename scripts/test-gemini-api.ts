/**
 * Test Script for Gemini API Key
 * Run with: npx tsx scripts/test-gemini-api.ts
 * Or: ts-node scripts/test-gemini-api.ts
 */

import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Key...\n')

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in .env file')
    process.exit(1)
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...`)
  console.log(`📝 Model: ${process.env.GEMINI_MODEL || 'gemini-pro'}\n`)

  const model = process.env.GEMINI_MODEL || 'gemini-pro'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const testMessage = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Say "Hello, Gemini API is working!" in one sentence.' }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
    },
  }

  try {
    console.log('📤 Sending test request to Gemini API...')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    })

    console.log(`📥 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', errorText)
      process.exit(1)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (content) {
      console.log('\n✅ SUCCESS! Gemini API is working correctly!')
      console.log(`📝 Response: ${content}\n`)
      console.log('✅ Your Gemini API key is valid and ready to use as a fallback.')
      return true
    } else {
      console.error('❌ No content in response:', JSON.stringify(data, null, 2))
      return false
    }
  } catch (error) {
    console.error('❌ Error testing Gemini API:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return false
  }
}

// Run the test
testGeminiAPI()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })

