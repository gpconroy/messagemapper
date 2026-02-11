import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function testRawRLS() {
  const tenantId = '2018fff4-c71b-40df-bc06-ef787a551a87' // Acme Corp

  console.log('Test 1: Query without setting tenant (should see all or none)')
  const result1 = await prisma.$queryRaw<Array<{ email: string; tenantId: string }>>`
    SELECT email, "tenantId" FROM users
  `
  console.log(`  Returned: ${result1.length} users`)
  for (const u of result1) {
    console.log(`    - ${u.email}`)
  }
  console.log('')

  console.log(`Test 2: Query with set_config in transaction (should see only Acme)`)
  const [, result2] = await prisma.$transaction([
    prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
    prisma.$queryRaw<Array<{ email: string; tenantId: string }>>`SELECT email, "tenantId" FROM users`,
  ])
  console.log(`  Returned: ${result2.length} users`)
  for (const u of result2) {
    console.log(`    - ${u.email}`)
  }
}

testRawRLS()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
