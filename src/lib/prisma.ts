import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables for scripts and non-Next.js contexts
// Load .env.local first with override, then .env for defaults
dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
