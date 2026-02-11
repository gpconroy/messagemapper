import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function checkRLS() {
  console.log('Checking RLS configuration in database...\n')

  // Check if RLS is enabled on tables
  const result = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'workspaces', 'format_schemas', 'mapping_configs')
  `

  console.log('Row-Level Security Status:')
  for (const row of result) {
    console.log(`  ${row.tablename}: ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`)
  }
  console.log('')

  // Check policies
  const policies = await prisma.$queryRaw<Array<{ tablename: string; policyname: string }>>`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `

  console.log('RLS Policies:')
  for (const policy of policies) {
    console.log(`  ${policy.tablename}: ${policy.policyname}`)
  }
  console.log('')

  console.log(`Total policies: ${policies.length}`)
}

checkRLS()
  .catch((e) => {
    console.error('Check failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
