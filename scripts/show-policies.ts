import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function showPolicies() {
  const policies = await prisma.$queryRaw<Array<{
    schemaname: string
    tablename: string
    policyname: string
    permissive: string
    roles: string[]
    cmd: string
    qual: string
    with_check: string
  }>>`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users'
    ORDER BY policyname
  `

  console.log('RLS Policies for users table:\n')
  for (const policy of policies) {
    console.log(`Policy: ${policy.policyname}`)
    console.log(`  Command: ${policy.cmd}`)
    console.log(`  Using (qual): ${policy.qual}`)
    console.log(`  With Check: ${policy.with_check}`)
    console.log(`  Roles: ${policy.roles}`)
    console.log('')
  }
}

showPolicies()
  .catch((e) => {
    console.error('Show policies failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
