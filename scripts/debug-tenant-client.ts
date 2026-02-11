import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const prisma = new PrismaClient({ log: ['query'] })

function tenantClient(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          console.log(`\n[TenantClient] Setting tenant ID: ${tenantId}`)
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ])
          return result
        },
      },
    },
  })
}

async function debug() {
  // Get tenant IDs
  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } })
  const tenantA = tenants.find(t => t.slug === 'acme-corp')!

  console.log(`Testing with Tenant A: ${tenantA.id} (${tenantA.name})`)

  const dbA = tenantClient(tenantA.id)
  const users = await dbA.user.findMany()

  console.log(`\nUsers returned: ${users.length}`)
  for (const user of users) {
    console.log(`  - ${user.email} (tenantId: ${user.tenantId})`)
  }
}

debug()
  .catch((e) => {
    console.error('Debug failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
