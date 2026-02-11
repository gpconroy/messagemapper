import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function testPolicyEval() {
  const testTenantId = '2018fff4-c71b-40df-bc06-ef787a551a87' // Acme Corp ID

  console.log(`Testing policy evaluation with tenant ID: ${testTenantId}\n`)

  // Test in transaction: set config, then query users table directly with the policy condition
  const [, result] = await prisma.$transaction([
    prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, TRUE)`,
    prisma.$queryRaw<Array<any>>`
      SELECT
        "tenantId",
        current_setting('app.current_tenant_id', TRUE) as current_tenant,
        ("tenantId" = current_setting('app.current_tenant_id', TRUE)) as matches
      FROM users
    `,
  ])

  console.log('Results from users table:')
  for (const row of result) {
    console.log(`  tenantId: ${row.tenantId}`)
    console.log(`  current_tenant: "${row.current_tenant}"`)
    console.log(`  matches: ${row.matches}`)
    console.log('')
  }
}

testPolicyEval()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
