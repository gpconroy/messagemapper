import { prisma } from './prisma'

/**
 * Creates a Prisma Client that automatically scopes all queries
 * to a specific tenant using PostgreSQL Row-Level Security.
 *
 * Usage:
 *   const db = tenantClient(session.user.tenantId)
 *   const workspaces = await db.workspace.findMany() // Only returns this tenant's data
 *
 * How it works:
 * 1. Before each query, sets PostgreSQL runtime parameter `app.current_tenant_id`
 * 2. RLS policies on each table filter rows by this parameter
 * 3. All operations (SELECT, INSERT, UPDATE, DELETE) are scoped
 *
 * IMPORTANT: Never use the raw `prisma` client directly for tenant data.
 * Always use `tenantClient(tenantId)` to ensure data isolation.
 */
export function tenantClient(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
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

/**
 * Type alias for the tenant-scoped Prisma Client.
 * Use this when typing function parameters that accept a tenant client.
 */
export type TenantPrismaClient = ReturnType<typeof tenantClient>
