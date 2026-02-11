# Plan 01-03: RLS Policies & Database Deployment — COMPLETE

**Status:** ✅ Complete  
**Completed:** 2026-02-11  
**Commits:** 0026ca1, 3edeb89

## Overview

Applied Row-Level Security policies to the database, created seed data for two isolated tenants, built an automated verification script that proves cross-tenant isolation works, and configured Vercel deployment. This closes the critical gap between the RLS client factory (01-02) and actual database enforcement.

## What Was Built

### Task 1: RLS SQL Migration & Database Setup
- Created `prisma/migrations/00000000000000_enable_rls/migration.sql` with FORCE RLS on 4 tables
- Applied RLS policies: tenant_isolation_policy (SELECT/UPDATE/DELETE) and tenant_insert_policy (INSERT)
- format_schemas allows NULL tenantId for shared library schemas
- mapping_configs uses subquery through workspaces for tenant isolation
- Configured tsx and prisma seed in package.json

### Task 2: Seed Data, Verification & Deployment
- Created `prisma/seed.ts` with 2 tenants (Acme Corp, Globex Inc), 2 users, 2 workspaces, 3 schemas, 1 mapping config
- Built `scripts/verify-rls.ts` with 10 automated tests proving complete tenant isolation
- **Critical Fix:** Created `app_user` role without BYPASSRLS privilege (neondb_owner was bypassing RLS)
- Updated DATABASE_URL to use app_user for RLS enforcement
- Rewrote `tenantClient` → `tenantQuery` using interactive transactions for guaranteed same-connection execution
- Created `vercel.json` with prisma generate in build pipeline
- All RLS tests pass: tenants see only own data + shared library schemas

## Key Decisions

1. **BYPASSRLS Discovery:** Neon's default `neondb_owner` role has BYPASSRLS privilege, which bypasses all RLS policies even with FORCE. Solution: created `app_user` role without BYPASSRLS.

2. **Client Extension Limitation:** Prisma's `$extends` query middleware doesn't guarantee same-connection execution with `$transaction([])`. Solution: switched to interactive transactions with `$transaction(async (tx) => ...)`.

3. **tenantQuery API:** Changed from `tenantClient(id).model.findMany()` to `tenantQuery(id, (db) => db.model.findMany())` to enforce transaction-scoped queries.

## Verification

- ✅ RLS enabled on users, workspaces, format_schemas, mapping_configs
- ✅ 8 policies exist (2 per table: isolation + insert)
- ✅ Seed creates 2 tenants, 2 users, 2 workspaces, 3 schemas, 1 mapping
- ✅ `npm run verify:rls` passes all 10 tests
- ✅ Tenant A sees only Acme data + ISO20022 library schema
- ✅ Tenant B sees only Globex data + ISO20022 library schema
- ✅ Fake tenant sees nothing except library schemas
- ✅ `npm run build` passes with zero errors

## Files Modified/Created

**Created:**
- prisma/migrations/00000000000000_enable_rls/migration.sql (RLS policies)
- prisma/seed.ts (2-tenant seed data)
- scripts/verify-rls.ts (automated RLS verification)
- vercel.json (deployment config)

**Modified:**
- .env (DATABASE_URL → app_user with generated password)
- package.json (added verify:rls script)
- src/lib/rls.ts (tenantClient → tenantQuery with interactive transactions)

## Deviations from Plan

1. **Additional Step:** Had to create `app_user` role without BYPASSRLS (plan assumed neondb_owner would respect FORCE RLS, but it has BYPASSRLS attribute)
2. **API Change:** Changed tenantClient API from client extension to tenantQuery function for reliable transaction scoping

## Next Steps

Phase 01 (Foundation Infrastructure) is complete. Next: Phase 02 (Schema Management)
