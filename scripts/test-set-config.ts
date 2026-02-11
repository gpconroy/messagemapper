import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function testSetConfig() {
  const testTenantId = '12345678-1234-1234-1234-123456789012'

  console.log(`Testing set_config with tenant ID: ${testTenantId}\n`)

  // Test 1: Set and read in separate queries (should fail with TRUE)
  await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, TRUE)`
  console.log('set_config executed (local-only)')

  const result1 = await prisma.$queryRaw<Array<{ current_setting: string }>>`
    SELECT current_setting('app.current_tenant_id', TRUE) as current_setting
  `

  console.log(`Separate query result: "${result1[0]?.current_setting}"`)
  console.log(`Match: ${result1[0]?.current_setting === testTenantId}\n`)

  // Test 2: Set and read in same transaction (should work)
  const [, result2] = await prisma.$transaction([
    prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, TRUE)`,
    prisma.$queryRaw<Array<{ current_setting: string }>>`SELECT current_setting('app.current_tenant_id', TRUE) as current_setting`,
  ])

  console.log(`Transaction result: "${result2[0]?.current_setting}"`)
  console.log(`Match: ${result2[0]?.current_setting === testTenantId}`)
}

testSetConfig()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
