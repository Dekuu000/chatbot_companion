import { buildFallbackResponse, determineUserStage, detectIntent } from '@/lib/ai/chat-response'

const messages = [
  'I like coding. What careers can I try?',
  'What skills should I learn for frontend?',
  'How much does a data analyst earn in PH?',
  'I am a frontend developer and I want to change my career into data analyst.',
]

messages.forEach((message) => {
  const stage = determineUserStage(message, null)
  const intent = detectIntent(message).category
  const response = buildFallbackResponse({ stage, intent, message })
  console.log('\n==========================================')
  console.log('User:', message)
  console.log('Stage:', stage, '| Intent:', intent)
  console.log('\nAssistant Response:\n')
  console.log(response)
})
