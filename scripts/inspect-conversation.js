const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  const conversationId = process.argv[2]
  if (!conversationId) {
    console.error('Usage: node scripts/inspect-conversation.js <conversationId>')
    process.exit(1)
  }
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, title: true, messageCount: true, lastMessageAt: true },
    })
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    })
    console.log('Conversation:', conversation)
    console.log('Messages:')
    messages.forEach((msg) => {
      console.log(`${msg.role} @ ${msg.createdAt.toISOString()}: ${msg.content}`)
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

