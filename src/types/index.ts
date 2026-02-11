// Shared TypeScript types for MessageMapper
// Prisma-generated types will be the source of truth for database models.
// This file holds application-level types that extend or compose Prisma types.

/** Role within a tenant workspace */
export type WorkspaceRole = 'admin' | 'editor' | 'viewer'

/** Session context for multi-tenant operations */
export interface TenantContext {
  tenantId: string
  userId: string
  role: WorkspaceRole
}

/** Standard API error response shape */
export interface ApiError {
  error: string
  code?: string
  details?: Record<string, string[]>
}

/** Standard API success response wrapper */
export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
  }
}
