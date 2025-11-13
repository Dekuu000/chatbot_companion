/**
 * Test Script for Gemini Fallback Mechanism
 * Run with: node scripts/test-gemini-fallback.js
 * 
 * This script tests the fallback mechanism by using the callAIWithFallback function
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

async function testFallback() {
  console.log('🧪 Testing Gemini Fallback Mechanism...\n')

  // Check if both API keys are set
  const perplexityKey = process.env.PERPLEXITY_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  console.log(`Perplexity API Key: ${perplexityKey ? '✅ Set' : '❌ Not set'}`)
  console.log(`Gemini API Key: ${geminiKey ? '✅ Set' : '❌ Not set'}\n`)

  if (!geminiKey) {
    console.error('❌ GEMINI_API_KEY is required for fallback testing')
    process.exit(1)
  }

  // Import the fallback function
  try {
    // Use dynamic import for ES modules
    const { callAIWithFallback } = await import('../lib/openai.ts')
    
    const testMessages = [
      {
        role: 'user',
        content: 'Say "Fallback test successful!" in one sentence.',
      },
    ]

    console.log('📤 Testing fallback function with a simple prompt...')
    console.log('Note: This will try Perplexity first, then fallback to Gemini if Perplexity fails.\n')

    const result = await callAIWithFallback(testMessages, {
      temperature: 0.7,
      maxTokens: 100,
    })

    console.log('✅ Fallback function executed successfully!')
    console.log(`📝 Provider used: ${result.provider}`)
    console.log(`🤖 Model: ${result.model}`)
    console.log(`💬 Response: ${result.content.substring(0, 200)}...\n`)

    if (result.provider === 'gemini') {
      console.log('✅ Fallback to Gemini was triggered successfully!')
    } else {
      console.log('ℹ️  Perplexity worked, so fallback was not needed.')
      console.log('   To test fallback, you can temporarily break your Perplexity API key.')
    }

    return true
  } catch (error) {
    console.error('❌ Error testing fallback:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    return false
  }
}

// Run the test
testFallback()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })

