import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function checkForceRLS() {
  const result = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean; relforcerowsecurity: boolean }>>`
    SELECT
      c.relname as tablename,
      c.relrowsecurity as rowsecurity,
      c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname IN ('users', 'workspaces', 'format_schemas', 'mapping_configs')
  `

  console.log('RLS Force Status:')
  for (const row of result) {
    console.log(`  ${row.tablename}:`)
    console.log(`    RLS Enabled: ${row.rowsecurity}`)
    console.log(`    RLS Forced: ${row.relforcerowsecurity}`)
  }
}

checkForceRLS()
  .catch((e) => {
    console.error('Check failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
