/**
 * Test Script for Gemini API Key
 * Run with: node scripts/test-gemini-api.js
 */

const fs = require('fs')
const path = require('path')

// Simple .env file parser
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath)
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  const env = {}
  
  envContent.split('\n').forEach((line) => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        env[key] = value
      }
    }
  })
  
  return env
}

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Key...\n')

  const env = loadEnv()
  const apiKey = env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in .env file')
    console.error('   Please add GEMINI_API_KEY="your-api-key" to your .env file')
    process.exit(1)
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...`)
  // Try multiple models in order of preference
  const modelsToTry = env.GEMINI_MODEL 
    ? [env.GEMINI_MODEL]
    : ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro-latest']
  
  console.log(`📝 Trying models: ${modelsToTry.join(', ')}\n`)
  
  let lastError = null
  for (const model of modelsToTry) {
    console.log(`🔄 Trying model: ${model}...`)

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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      })

      console.log(`   📥 Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        let errorJson = null
        try {
          errorJson = JSON.parse(errorText)
        } catch {}
        
        // If it's a temporary overload (503), try next model
        if (response.status === 503) {
          console.log(`   ⚠️  Model overloaded, trying next model...\n`)
          lastError = errorJson || errorText
          continue
        }
        
        // For other errors, show details
        console.error('\n❌ API Error Response:')
        console.error(errorText)
        
        if (errorJson?.error) {
          console.error('\n📋 Error Details:')
          console.error(JSON.stringify(errorJson, null, 2))
          
          if (errorJson.error.message?.includes('API key')) {
            console.error('\n💡 API key issue detected')
            process.exit(1)
          }
          if (errorJson.error.message?.includes('not enabled')) {
            console.error('\n💡 Gemini API not enabled in Google Cloud Console')
            process.exit(1)
          }
        }
        
        lastError = errorJson || errorText
        continue
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (content) {
        console.log(`\n✅ SUCCESS! Gemini API is working correctly with model: ${model}`)
        console.log(`📝 Response: ${content}\n`)
        console.log('✅ Your Gemini API key is valid and ready to use as a fallback.')
        console.log('✅ The fallback mechanism will automatically use Gemini when Perplexity fails.\n')
        return true
      } else {
        console.error('   ❌ No content in response')
        lastError = 'No content in response'
        continue
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      lastError = error
      continue
    }
  }
  
  // If we get here, all models failed
  console.error('\n❌ All models failed. Last error:', lastError)
  console.error('\n💡 This might be a temporary issue. The API key appears to be valid.')
  console.error('   Try again in a few moments, or check Google Cloud Console for quota limits.')
  return false
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
