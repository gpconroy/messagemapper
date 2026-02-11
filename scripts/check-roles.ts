import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient()

async function checkRoles() {
  const roles = await prisma.$queryRaw<Array<{ rolname: string }>>`
    SELECT rolname FROM pg_roles WHERE pg_has_role(current_user, oid, 'member')
  `

  console.log('Current user is member of roles:')
  for (const role of roles) {
    console.log(`  - ${role.rolname}`)
  }
}

checkRoles()
  .catch((e) => {
    console.error('Check failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
