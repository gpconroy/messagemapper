import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function checkOwner() {
  const result = await prisma.$queryRaw<Array<{ tableowner: string }>>`
    SELECT tableowner FROM pg_tables WHERE tablename='users' AND schemaname='public'
  `

  console.log(`Table owner: ${result[0].tableowner}`)
}

checkOwner()
  .catch((e) => {
    console.error('Check failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
