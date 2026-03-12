import Anthropic from '@anthropic-ai/sdk'

// Singleton — solo se instancia en el servidor (API routes, Server Actions)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
