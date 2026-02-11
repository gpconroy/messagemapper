---
phase: 01-foundation-infrastructure
plan: 02
subsystem: database
tags: [prisma, postgresql, rls, multi-tenant, schema]
dependencies:
  requires:
    - Next.js scaffold from 01-01
    - TypeScript strict mode from 01-01
  provides:
    - Prisma schema with Tenant, User, Workspace, FormatSchema, MappingConfig models
    - Prisma Client singleton with globalThis caching
    - Tenant-scoped RLS client factory
    - Type-safe environment variable access (DATABASE_URL, DIRECT_URL)
  affects:
    - All database operations in Phase 2+ must use tenantClient() for data isolation
    - Prisma-generated types available for import throughout application
tech_stack:
  added:
    - Prisma 7.3.0 (CLI + Client)
    - PostgreSQL datasource provider
  patterns:
    - Multi-tenant schema with cascade deletes
    - Prisma Client singleton pattern (globalThis caching)
    - RLS-aware client extension via $extends
    - Runtime parameter scoping (app.current_tenant_id)
key_files:
  created:
    - prisma/schema.prisma
    - prisma.config.ts
    - src/lib/prisma.ts
    - src/lib/rls.ts
    - src/lib/env.ts
  modified:
    - package.json (added prisma dependencies)
decisions:
  - title: "Prisma 7 configuration pattern adopted"
    rationale: "Prisma 7 moved datasource URL config from schema.prisma to prisma.config.ts. This separates connection config from schema definition."
    alternatives: ["Downgrade to Prisma 6 with url in schema"]
    impact: "DATABASE_URL and DIRECT_URL now configured in prisma.config.ts instead of schema file. Migration commands may need --direct-url flag."
  - title: "FormatSchema.tenantId is nullable for shared library schemas"
    rationale: "Library schemas (XSD, JSON standards) should be shared across tenants. Custom schemas belong to specific tenants."
    alternatives: ["Duplicate library schemas per tenant", "Separate LibrarySchema model"]
    impact: "RLS policies must handle null tenantId for library schemas. Queries must filter isLibrary flag."
  - title: "MappingConfig stores mappingData as Json type"
    rationale: "Field-to-field mappings have flexible structure (direct mapping, transformations, conditions). Json type provides schema flexibility."
    alternatives: ["Separate MappingRule table with relations", "Stringified JSON"]
    impact: "Application must handle Json parsing/serialization. TypeScript types for mappingData structure defined separately."
  - title: "Prisma Client singleton with globalThis caching"
    rationale: "Next.js hot reloads in development can create multiple Prisma Client instances, exhausting connection pool. globalThis caching prevents this."
    alternatives: ["New PrismaClient per import", "Manual singleton pattern"]
    impact: "Single Prisma Client instance reused across hot reloads. Connection pool remains stable in development."
metrics:
  duration_seconds: 876
  tasks_completed: 2
  files_created: 5
  commits: 2
  completed_at: "2026-02-11"
---

# Phase 01 Plan 02: Prisma Multi-Tenant Database Schema Summary

**One-liner:** Prisma 7 schema defining 5 core multi-tenant models with RLS-aware client factory and type-safe environment access.

## Objective Achievement

Established the complete multi-tenant database schema using Prisma, with all core models defined and the RLS-aware client infrastructure in place. Every feature in phases 2-10 will use these models and the tenant isolation pattern.

**Success Criteria Met:**
- [x] Prisma schema defines 5 core models with proper relations and indexes
- [x] prisma generate produces TypeScript types for all models
- [x] Prisma Client singleton prevents connection pool exhaustion in dev
- [x] Tenant client factory scopes all queries via RLS set_config
- [x] All TypeScript compiles cleanly with strict mode

## Tasks Completed

### Task 1: Install Prisma and define multi-tenant database schema
**Commit:** 227c93f
**Status:** Complete

Installed Prisma dependencies, initialized with PostgreSQL provider, and created the complete multi-tenant schema with 5 core models. Adapted to Prisma 7's new configuration pattern.

**Files created:**
- prisma/schema.prisma (Tenant, User, Workspace, FormatSchema, MappingConfig models)
- prisma.config.ts (datasource configuration with DATABASE_URL)
- src/lib/env.ts (type-safe environment variable access)

**Schema Design:**
- **Tenant** - Top-level organization/company isolation unit
- **User** - Belongs to tenant with role (admin/editor/viewer)
- **Workspace** - Project area within tenant for organizing mappings
- **FormatSchema** - Uploaded or library format definition (nullable tenantId for shared schemas)
- **MappingConfig** - Saved mapping between two FormatSchemas with Json mappingData

**Key Decisions:**
- Lowercase table names via @@map (PostgreSQL convention, required for RLS policies)
- Cascade deletes on tenant relations for clean tenant removal
- Indexes on all foreign keys for query performance
- Json type for mappingData (flexible structure for transformations)

**Verification:**
- `npx prisma validate` passed
- `npx prisma generate` succeeded
- `npx tsc --noEmit` passed with zero errors
- All 5 models present in schema

### Task 2: Create Prisma Client singleton and RLS tenant client factory
**Commit:** f9f65c6
**Status:** Complete

Created the Prisma Client singleton with globalThis caching and the tenant-scoped RLS client factory using Prisma's $extends API.

**Files created:**
- src/lib/prisma.ts (Prisma Client singleton with dev query logging)
- src/lib/rls.ts (tenantClient factory + TenantPrismaClient type)

**RLS Implementation:**
- Uses Prisma $extends to intercept all queries
- Wraps each operation in transaction with set_config('app.current_tenant_id')
- PostgreSQL RLS policies will filter rows based on this runtime parameter
- Type-safe TenantPrismaClient alias for function parameters

**Verification:**
- `npx tsc --noEmit` passed
- src/lib/prisma.ts exports `prisma`
- src/lib/rls.ts exports `tenantClient` and `TenantPrismaClient`
- rls.ts imports from prisma.ts singleton (not creating duplicate client)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Adapted to Prisma 7 configuration pattern**
- **Found during:** Task 1, running `npx prisma generate`
- **Issue:** Prisma 7 removed `url` and `directUrl` from datasource block in schema.prisma. These properties are now configured in prisma.config.ts. Error: "The datasource property `url` is no longer supported in schema files."
- **Fix:** Removed `url` and `directUrl` from schema.prisma datasource block. Added `url` to prisma.config.ts datasource config. Added comment about DIRECT_URL usage for migrations.
- **Files modified:** prisma/schema.prisma, prisma.config.ts
- **Commit:** Included in 227c93f (Task 1)
- **Impact:** Configuration now follows Prisma 7 pattern. Migration commands may need --direct-url flag when bypassing connection pooling.

## Key Decisions

### 1. Prisma 7 Configuration Pattern
**Context:** Prisma 7 changed how database connection URLs are configured, moving them from schema.prisma to prisma.config.ts.

**Decision:** Remove datasource url/directUrl from schema, configure in prisma.config.ts instead.

**Impact:**
- DATABASE_URL configured in prisma.config.ts
- DIRECT_URL for migrations passed via CLI flag or future config support
- Cleaner separation between schema definition and connection config

### 2. Nullable tenantId for Library Schemas
**Context:** Some format schemas (XSD standards, JSON schema library) should be shared across all tenants, while custom schemas belong to specific tenants.

**Decision:** Make FormatSchema.tenantId nullable. Use isLibrary flag to distinguish shared vs tenant-specific schemas.

**Impact:**
- Library schemas (isLibrary=true, tenantId=null) visible to all tenants
- Custom schemas (isLibrary=false, tenantId set) scoped to specific tenant
- RLS policies must handle null tenantId case
- Queries must filter on isLibrary when needed

### 3. Json Type for MappingData
**Context:** Field-to-field mappings can be simple (direct field mapping) or complex (transformations, conditional logic, multiple sources).

**Decision:** Use Prisma's Json type for MappingConfig.mappingData instead of separate MappingRule table.

**Impact:**
- Flexible schema allows evolution without migrations
- Application code handles Json parsing/serialization
- TypeScript types for mappingData defined separately in src/types/
- Trade-off: Less SQL query capability on mapping structure

### 4. Prisma Client Singleton with globalThis
**Context:** Next.js hot reloads in development can create multiple PrismaClient instances, exhausting the database connection pool.

**Decision:** Use globalThis caching pattern to reuse single PrismaClient instance across hot reloads.

**Impact:**
- Single connection pool throughout dev session
- Development logging enabled (query, error, warn)
- Production uses single instance with error-only logging

## Outputs

**Artifacts Created:**
- Multi-tenant Prisma schema with 5 core models
- Prisma Client singleton (src/lib/prisma.ts)
- RLS tenant client factory (src/lib/rls.ts)
- Type-safe environment variables (src/lib/env.ts)
- Prisma configuration (prisma.config.ts)

**Dependencies Provided:**
- Tenant, User, Workspace, FormatSchema, MappingConfig TypeScript types (Prisma-generated)
- tenantClient(tenantId) function for RLS-scoped database operations
- TenantPrismaClient type alias for type-safe parameters
- env.DATABASE_URL and env.DIRECT_URL for connection config

**Next Phase Requirements:**
- Phase 01 Plan 03 will run database migrations to create tables
- All Phase 2+ database operations MUST use tenantClient() for data isolation
- Never use raw `prisma` client for tenant-scoped data
- Import Prisma-generated types from '@prisma/client'

## Performance

**Execution Time:** 876 seconds (14.6 minutes)
**Tasks:** 2 of 2 completed (100%)
**Commits:** 2 atomic commits
**Files:** 5 created, 2 modified (package.json, package-lock.json)

## Self-Check: PASSED

**Created files verification:**
```bash
FOUND: prisma/schema.prisma
FOUND: prisma.config.ts
FOUND: src/lib/prisma.ts
FOUND: src/lib/rls.ts
FOUND: src/lib/env.ts
```

**Commit verification:**
```bash
FOUND: 227c93f feat(01-02): define multi-tenant database schema with Prisma
FOUND: f9f65c6 feat(01-02): create Prisma Client singleton and RLS tenant client factory
```

**Verification commands:**
```bash
✓ npx prisma validate passed
✓ npx prisma generate succeeded
✓ npx tsc --noEmit passed with zero TypeScript errors
```

**Schema verification:**
```bash
✓ model Tenant present
✓ model User present
✓ model Workspace present
✓ model FormatSchema present
✓ model MappingConfig present
```

**RLS verification:**
```bash
✓ prisma.$extends used in tenantClient
✓ set_config('app.current_tenant_id') present in RLS factory
✓ rls.ts imports from prisma.ts singleton
```

All claims verified. Plan 01-02 complete.
