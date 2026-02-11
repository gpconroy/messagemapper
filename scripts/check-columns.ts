import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function checkColumns() {
  const tables = ['users', 'workspaces', 'format_schemas', 'mapping_configs']

  for (const table of tables) {
    const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name LIKE '%tenant%'
      ORDER BY ordinal_position
    `

    console.log(`${table}:`)
    for (const col of columns) {
      console.log(`  ${col.column_name} (${col.data_type})`)
    }
    console.log('')
  }
}

checkColumns()
  .catch((e) => {
    console.error('Check failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
