/**
 * List available Gemini models
 * Run with: node scripts/list-gemini-models.js
 */

const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found')
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
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        env[key] = value
      }
    }
  })
  
  return env
}

async function listModels() {
  const env = loadEnv()
  const apiKey = env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set')
    process.exit(1)
  }

  console.log('🔍 Fetching available Gemini models...\n')

  // Try v1beta first
  const urls = [
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
  ]

  for (const url of urls) {
    try {
      console.log(`Trying: ${url.split('?')[0]}...`)
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        const models = data.models || []
        
        console.log(`\n✅ Found ${models.length} models:\n`)
        models.forEach((model) => {
          console.log(`  - ${model.name}`)
          if (model.supportedGenerationMethods) {
            console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`)
          }
        })
        
        // Find models that support generateContent
        const generateContentModels = models.filter(m => 
          m.supportedGenerationMethods?.includes('generateContent')
        )
        
        if (generateContentModels.length > 0) {
          console.log(`\n✅ Models supporting generateContent (${generateContentModels.length}):\n`)
          generateContentModels.forEach((model) => {
            const shortName = model.name.split('/').pop()
            console.log(`  - ${shortName} (${model.name})`)
          })
          return generateContentModels[0].name.split('/').pop()
        }
        
        return null
      } else {
        const errorText = await response.text()
        console.log(`  ❌ ${response.status}: ${errorText.substring(0, 100)}...`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
  }
  
  return null
}

listModels().then((model) => {
  if (model) {
    console.log(`\n💡 Recommended model: ${model}`)
  }
  process.exit(0)
}).catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

