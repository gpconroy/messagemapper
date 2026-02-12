---
status: verifying
trigger: "Investigate issue: production-signup-rls-violation"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:30Z
---

## Current Focus

hypothesis: CONFIRMED - Fix applied
test: Deploy to production and test signup flow
expecting: Signup completes successfully, user is created and redirected to dashboard
next_action: Deploy to Vercel production and verify fix

## Symptoms

expected: User fills out signup form, account is created, redirected to dashboard
actual: Signup fails with error message "Unable to complete signup right now. Please try again."
errors: Vercel logs show: `prisma:error Invalid prisma.user.create() invocation: Error occurred during query execution: ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "42501", message: "new row violates row-level security policy for table \"users\"", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })`
reproduction: Navigate to https://messagemapper.vercel.app/signup, fill out form with new email/organization, submit
started: Started immediately after deployment to Vercel. Works fine in local development.

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:00:00Z
  checked: Initial context
  found: app_user role has RLS policies enabled, neondb_owner bypasses RLS, production uses app_user role, signup creates tenant AND user in same transaction
  implication: User INSERT blocked because no tenant context exists yet during transaction

- timestamp: 2026-02-12T00:00:05Z
  checked: src/app/(auth)/signup/actions.ts lines 77-94
  found: Transaction creates tenant first (line 78-83), then creates user with tenantId (line 85-93). No SET LOCAL app.current_tenant_id call anywhere in the flow.
  implication: User INSERT happens without required RLS context variable being set

- timestamp: 2026-02-12T00:00:10Z
  checked: prisma/migrations/00000000000001_fix_rls_roles/migration.sql lines 21-24
  found: tenant_insert_policy requires WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE))
  implication: Even though tenantId column is provided in the INSERT, RLS policy checks current_setting('app.current_tenant_id') which is not set

- timestamp: 2026-02-12T00:00:15Z
  checked: src/lib/rls.ts
  found: tenantQuery helper exists that sets app.current_tenant_id via set_config within a transaction
  implication: Need to use similar pattern in signup, but must create tenant first, then set context, then create user

## Resolution

root_cause: Signup transaction creates user without setting app.current_tenant_id session variable. RLS INSERT policy on users table checks this variable and blocks the operation when it's not set, even though tenantId column value is correct. Production uses app_user role (no BYPASSRLS), so RLS is enforced.
fix: After creating tenant in transaction, call set_config to set app.current_tenant_id to the new tenant's ID, then create user. All within same transaction.
verification: Test signup flow in production environment
files_changed: ["src/app/(auth)/signup/actions.ts"]
