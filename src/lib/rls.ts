import { PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

/**
 * Creates a tenant-scoped database client using PostgreSQL session variables.
 *
 * IMPORTANT: Due to Prisma's query extension limitations with connection pooling,
 * this implementation wraps every operation in an interactive transaction to ensure
 * the set_config and query execute on the same connection.
 *
 * Usage:
 *   const users = await tenantQuery(tenantId, async (db) => {
 *     return db.user.findMany()
 *   })
 */
export async function tenantQuery<T>(
  tenantId: string,
  fn: (db: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set tenant context for this transaction
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`
    // Execute the query within the same transaction/connection
    return fn(tx as PrismaClient)
  })
}

/**
 * @deprecated Use tenantQuery instead for guaranteed RLS enforcement
 */
export function tenantClient(tenantId: string) {
  throw new Error('tenantClient is deprecated - use tenantQuery instead')
}

export type TenantPrismaClient = PrismaClient
