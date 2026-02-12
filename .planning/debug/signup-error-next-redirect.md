---
status: verifying
trigger: "signup-error-next-redirect"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Fixed by re-throwing unhandled errors
test: testing signup flow to verify redirect works
expecting: user creation succeeds and user is redirected to /dashboard without error message
next_action: manual verification - test signup flow

## Symptoms

expected: User fills out signup form, submits, and is redirected to /dashboard
actual: User sees "An error occurred during signup" message and stays on signup page
errors: Server logs show "Signup error: Error: NEXT_REDIRECT" at signup action line 64
reproduction: Navigate to /signup, fill in all fields (name, email, password, organization), submit form
started: Just discovered during Phase 7 human verification testing

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:00:00Z
  checked: Server logs (b5ba730.output)
  found: Database transaction completes successfully (COMMIT shown), then signIn() throws NEXT_REDIRECT
  implication: User/tenant ARE created successfully, but redirect is being caught as error

- timestamp: 2026-02-12T00:00:00Z
  checked: Error digest
  found: digest: 'NEXT_REDIRECT;push;http://localhost:3000/dashboard;307;'
  implication: This is Next.js's expected redirect mechanism, not an actual error

- timestamp: 2026-02-12T00:00:00Z
  checked: src/app/(auth)/signup/actions.ts lines 64-77
  found: signIn() at line 64 is inside try block (line 19), catch block at line 71 catches ALL errors including NEXT_REDIRECT
  implication: Next.js redirect is being treated as error - catch block needs to rethrow NEXT_REDIRECT

- timestamp: 2026-02-12T00:00:00Z
  checked: Next.js Auth.js documentation and GitHub discussions
  found: NEXT_REDIRECT is Next.js's internal redirect signal, must be re-thrown to allow redirect
  implication: Best practice is to re-throw unhandled errors after checking for known error types

- timestamp: 2026-02-12T00:00:00Z
  checked: src/app/(auth)/login/actions.ts line 50
  found: Login action already has correct pattern: "throw error" to re-throw unhandled errors
  implication: Signup action should follow same pattern

## Resolution

root_cause: signIn() at line 64 throws NEXT_REDIRECT (Next.js's redirect mechanism), but the try-catch block (lines 19-77) catches this as an error. The catch block returns {error: "An error occurred during signup"} instead of allowing the redirect to propagate.
fix: Changed catch block to re-throw unhandled errors (after handling ZodError), matching the pattern used in login action. This allows NEXT_REDIRECT to propagate properly.
verification:
files_changed: [src/app/(auth)/signup/actions.ts]
