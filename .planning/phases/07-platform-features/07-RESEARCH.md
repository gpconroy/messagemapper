# Phase 7: Platform Features - Research

**Researched:** 2026-02-12
**Domain:** Next.js authentication, RBAC, multi-tenant SaaS, session management
**Confidence:** HIGH

## Summary

Phase 7 implements authentication, role-based access control (RBAC), and workspace management for multi-tenant SaaS operation. The established pattern in Next.js 14+ with App Router uses Auth.js v5 (formerly NextAuth.js) for authentication, JWT-based sessions with HttpOnly cookies for security, middleware for route protection, and PostgreSQL RLS integration for tenant isolation. The existing Prisma schema with RLS policies (Phase 1) provides the foundation for secure multi-tenant data access.

Auth.js v5 is the current standard, rebranded from NextAuth.js to be more framework-agnostic. The credentials provider allows email/password authentication while maintaining full control over user management, password hashing (Argon2id recommended over bcrypt for 2026), and integration with existing Prisma models. Server Actions handle internal mutations (user signup, profile updates) while Route Handlers serve external webhooks and public APIs.

Critical security patterns include: server-side session validation (never trust client-side checks alone), HttpOnly cookies to prevent XSS attacks, proper password hashing with Argon2id, RLS enforcement through `tenantQuery` wrapper (already implemented), and role checks at both middleware and component levels.

**Primary recommendation:** Use Auth.js v5 with credentials provider, JWT session strategy, Argon2id password hashing, Next.js middleware for route protection, Server Actions for mutations, and leverage existing RLS infrastructure for tenant isolation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.x (beta) | Authentication framework | Official Next.js recommendation, supports App Router, extensive provider ecosystem, Prisma adapter |
| @auth/prisma-adapter | latest | Auth.js database adapter | Official adapter for Prisma, handles User/Account/Session models automatically |
| @node-rs/argon2 | ^2.0.0 | Password hashing | 2026 security standard, memory-hard algorithm resistant to GPU attacks, won Password Hashing Competition |
| zod | ^3.x | Input validation | Type-safe schema validation for credentials, already in use for transformations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jose | latest | JWT utilities | If building custom session logic outside Auth.js |
| iron-session | ^8.x | Alternative session library | If avoiding Auth.js entirely (not recommended with existing stack) |
| @tomfreudenberg/next-auth-mock | latest | Testing mocks | Unit/integration testing of authenticated components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js credentials | Clerk, Auth0, WorkOS | Managed services reduce code but add vendor lock-in and monthly costs ($0-$300+/month) |
| Argon2id | bcrypt | bcrypt is battle-tested but uses only 4KB memory vs Argon2's configurable 64MB+, making it vulnerable to GPU attacks |
| JWT sessions | Database sessions | DB sessions allow instant invalidation but add database load and don't work at edge |
| Server Actions | API Route Handlers | Route Handlers for external webhooks; Server Actions for internal mutations are simpler |

**Installation:**
```bash
npm install next-auth@beta @auth/prisma-adapter @node-rs/argon2 zod
npm install --save-dev @tomfreudenberg/next-auth-mock
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # Auth.js route handler
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── signup/
│   │   │   └── page.tsx              # Signup page
│   │   └── layout.tsx                # Public auth layout
│   └── (protected)/
│       ├── dashboard/
│       │   └── page.tsx              # Protected dashboard
│       ├── workspace/
│       │   └── [workspaceId]/
│       │       └── page.tsx          # Workspace-specific pages
│       └── layout.tsx                # Protected layout with auth checks
├── auth.ts                           # Auth.js configuration (root level)
├── middleware.ts                     # Route protection middleware
└── lib/
    ├── auth/
    │   ├── session.ts                # Session utilities
    │   ├── passwords.ts              # Argon2 hash/verify
    │   └── rbac.ts                   # Role checking utilities
    └── rls.ts                        # Existing tenant query wrapper
```

### Pattern 1: Auth.js Configuration with Credentials Provider
**What:** Configure Auth.js with credentials provider for email/password authentication integrated with existing Prisma User model.
**When to use:** For applications requiring full control over user creation, password storage, and authentication flow.
**Example:**
```typescript
// auth.ts (root level)
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth/passwords"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Required for credentials provider
  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors to login
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } = credentialsSchema.parse(credentials)

        const user = await prisma.user.findUnique({
          where: { email },
          include: { tenant: true },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await verifyPassword(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        }
      },
    }),
  ],
  callbacks: {
    // Add custom fields to JWT
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
      }
      return token
    },
    // Expose custom fields in session
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.tenantId = token.tenantId as string
      return session
    },
  },
})
```
**Source:** [Auth.js Credentials Provider](https://authjs.dev/getting-started/authentication/credentials)

### Pattern 2: Password Hashing with Argon2
**What:** Use Argon2id for secure password hashing with configurable memory and iteration parameters.
**When to use:** For all password storage operations (signup, password reset, password change).
**Example:**
```typescript
// src/lib/auth/passwords.ts
import { hash, verify } from "@node-rs/argon2"

const hashingConfig = {
  memoryCost: 65536,      // 64 MB
  timeCost: 3,            // 3 iterations
  parallelism: 4,         // 4 parallel threads
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, hashingConfig)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await verify(hash, password)
  } catch {
    return false
  }
}
```
**Source:** [Password Hashing Guide 2025: Argon2 vs Bcrypt](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/)

### Pattern 3: Middleware-Based Route Protection
**What:** Use Next.js middleware to check authentication before page renders, redirecting unauthenticated users.
**When to use:** For protecting entire route segments (admin pages, workspace pages, dashboard).
**Example:**
```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/signup")

  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```
**Source:** [Auth.js Protecting Routes](https://authjs.dev/getting-started/session-management/protecting)

### Pattern 4: Role-Based Access Control (RBAC)
**What:** Check user roles at middleware and component levels to enforce permissions (admin, editor, viewer).
**When to use:** For restricting access to features based on user roles within an organization.
**Example:**
```typescript
// src/lib/auth/rbac.ts
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export type Role = "admin" | "editor" | "viewer"

export async function requireRole(allowedRoles: Role[]) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    redirect("/unauthorized")
  }

  return session
}

// Usage in Server Component:
// const session = await requireRole(["admin", "editor"])

// Client component conditional rendering:
// "use client"
// import { useSession } from "next-auth/react"
// const { data: session } = useSession()
// const canEdit = ["admin", "editor"].includes(session?.user?.role)
```
**Source:** [Auth.js Role Based Access Control](https://authjs.dev/guides/role-based-access-control)

### Pattern 5: Tenant-Isolated Queries with RLS
**What:** Combine Auth.js session with existing `tenantQuery` wrapper to enforce Row-Level Security.
**When to use:** For all database operations that access tenant-specific data (workspaces, mappings, schemas).
**Example:**
```typescript
// src/app/(protected)/workspace/actions.ts
"use server"
import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { z } from "zod"

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export async function createWorkspace(formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    throw new Error("Unauthorized")
  }

  const data = createWorkspaceSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
  })

  return tenantQuery(session.user.tenantId, async (db) => {
    return db.workspace.create({
      data: {
        ...data,
        tenantId: session.user.tenantId,
      },
    })
  })
}
```
**Source:** Existing Phase 1 implementation in `src/lib/rls.ts`

### Pattern 6: Server Actions for Mutations
**What:** Use Server Actions for internal mutations (signup, update profile, create workspace) instead of API routes.
**When to use:** For all user-initiated mutations called from React components within the application.
**Example:**
```typescript
// src/app/(auth)/signup/actions.ts
"use server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/passwords"
import { signIn } from "@/auth"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1),
})

export async function signup(formData: FormData) {
  const data = signupSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    organizationName: formData.get("organizationName"),
  })

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existing) {
    return { error: "Email already registered" }
  }

  // Create tenant and user in transaction
  const passwordHash = await hashPassword(data.password)

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.organizationName,
        slug: data.organizationName.toLowerCase().replace(/\s+/g, "-"),
      },
    })

    await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "admin", // First user is admin
        tenantId: tenant.id,
      },
    })
  })

  // Sign in after successful signup
  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: "/dashboard",
  })
}
```
**Source:** [Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions)

### Pattern 7: Session Persistence and Logout
**What:** JWT sessions persist across browser refreshes via HttpOnly cookies; logout invalidates the cookie.
**When to use:** For maintaining logged-in state and providing logout functionality from any page.
**Example:**
```typescript
// src/components/LogoutButton.tsx
"use client"
import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign Out
    </button>
  )
}

// JWT session automatically persists across refreshes via HttpOnly cookie
// No additional code needed for persistence
// Cookie is automatically invalidated on signOut()
```
**Source:** [Auth.js Session Strategies](https://authjs.dev/concepts/session-strategies)

### Anti-Patterns to Avoid
- **Client-side only auth checks:** Always validate session server-side; client checks are easily bypassed
- **Storing tokens in localStorage:** Use HttpOnly cookies only; localStorage is vulnerable to XSS attacks
- **Bypassing RLS with direct Prisma queries:** Always use `tenantQuery()` wrapper for tenant-specific data
- **Using database sessions with credentials provider:** JWT is required for credentials provider; database sessions only work with OAuth providers
- **Exposing sensitive data to client components:** Never pass API keys, database URLs, or secrets to "use client" components
- **Missing input validation on Server Actions:** Always validate with Zod or similar; users can bypass client-side validation
- **Hardcoded redirect URLs:** Use `callbackUrl` parameter to maintain user context during auth flows

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT signing/verification | Auth.js JWT strategy | Handles encryption, expiration, rotation, CSRF protection, edge compatibility automatically |
| Password hashing | Custom crypto.pbkdf2 or MD5/SHA | @node-rs/argon2 | Argon2id is memory-hard (resists GPU attacks), configurable, and battle-tested; rolling your own risks catastrophic security flaws |
| CSRF protection | Custom token generation | Auth.js built-in CSRF | Auth.js automatically generates and validates CSRF tokens for all mutations |
| Session persistence | Custom cookie management | Auth.js HttpOnly cookies | Handles secure flags, SameSite policies, domain scoping, and edge cases across browsers |
| Email verification | Custom token expiry logic | Auth.js VerificationToken model | Handles token generation, expiration, cleanup, and race conditions |
| OAuth integration | Custom OAuth flow | Auth.js OAuth providers | Handles callback URLs, state parameters, token exchange, and provider-specific quirks |
| Rate limiting login attempts | Custom attempt tracking | Auth.js + database logging | Prevents brute force attacks; custom solutions miss edge cases (distributed attacks, IP spoofing) |
| Multi-factor authentication | Custom TOTP generation | Auth.js + Authenticator provider | Handles QR code generation, backup codes, recovery flows, and time synchronization issues |

**Key insight:** Authentication is the #1 attack surface in web applications. Using battle-tested libraries like Auth.js and Argon2 protects against vulnerabilities you haven't thought of yet (timing attacks, session fixation, token replay, etc.). Custom solutions built by developers unfamiliar with crypto invariably have critical security flaws.

## Common Pitfalls

### Pitfall 1: Client-Side Authentication Checks Without Server Validation
**What goes wrong:** Components check session client-side and hide UI, but API routes/Server Actions don't verify the session, allowing unauthorized access via direct API calls.
**Why it happens:** Developers assume client-side conditional rendering (`{session?.user ? <Admin /> : null}`) provides security.
**How to avoid:** Always validate session in Server Components, Server Actions, and API routes. Never trust client-side checks alone.
**Warning signs:** API routes without `await auth()` call at the top; Server Actions that don't check session before mutations.

### Pitfall 2: Missing `session` Strategy Configuration with Credentials Provider
**What goes wrong:** Auth.js defaults to database sessions, but credentials provider requires JWT sessions, causing silent authentication failures or "session undefined" errors.
**Why it happens:** Documentation examples use OAuth providers which support database sessions; credentials provider is a special case.
**How to avoid:** Explicitly set `session: { strategy: "jwt" }` in Auth.js config when using credentials provider.
**Warning signs:** Login appears successful but `useSession()` returns null; "adapter required" errors in console.

### Pitfall 3: Storing Sensitive Data in localStorage or Non-HttpOnly Cookies
**What goes wrong:** Session tokens, API keys, or user data stored in localStorage can be stolen via XSS attacks, compromising all user accounts.
**Why it happens:** localStorage is convenient and persists across tabs; developers don't understand HttpOnly cookie security model.
**How to avoid:** Use Auth.js defaults (HttpOnly cookies) and never manually store auth tokens in localStorage.
**Warning signs:** `localStorage.setItem("token", ...)` in codebase; cookies without `httpOnly: true` flag.

### Pitfall 4: Bypassing RLS with Direct Prisma Queries
**What goes wrong:** Developer forgets to use `tenantQuery()` wrapper and writes `prisma.workspace.findMany()`, exposing all workspaces across all tenants.
**Why it happens:** RLS is invisible during development (single tenant); easy to forget the wrapper when writing new queries.
**How to avoid:** Code review checklist: every Prisma query must use `tenantQuery()`; add ESLint rule to detect direct `prisma` imports in server code.
**Warning signs:** `prisma.user.findMany()` without tenantQuery wrapper; API routes that don't extract tenantId from session.

### Pitfall 5: Race Conditions in Signup Flow (Tenant + User Creation)
**What goes wrong:** Signup creates tenant, then user in separate queries; if user creation fails, tenant is left orphaned in database.
**Why it happens:** Developers split tenant and user creation into separate database calls without transaction.
**How to avoid:** Use `prisma.$transaction()` to create tenant and first user atomically; rollback both if either fails.
**Warning signs:** Orphaned tenants with zero users in database; "tenant already exists" errors during signup retry.

### Pitfall 6: Missing Input Validation on Server Actions
**What goes wrong:** Server Actions accept form data without validation; malicious users send crafted payloads causing database errors or security vulnerabilities.
**Why it happens:** Developers assume client-side form validation is sufficient; forget users can bypass browser and call actions directly.
**How to avoid:** Use Zod schemas to validate all Server Action inputs before processing; return validation errors to client.
**Warning signs:** `formData.get("email")` used directly without type checking; Prisma errors from invalid data types.

### Pitfall 7: Exposing NEXTAUTH_SECRET or Database Credentials to Client
**What goes wrong:** Developer accidentally imports server-side config file in client component, leaking secrets to browser bundle.
**Why it happens:** Next.js build doesn't always fail when server code is imported in client components; secrets end up in JavaScript bundle.
**How to avoid:** Use `NEXT_PUBLIC_` prefix only for truly public variables; keep `auth.ts` and database code in server-only directories; use `server-only` package.
**Warning signs:** Build warnings about server-only modules in client bundles; secrets visible in browser DevTools Network tab.

### Pitfall 8: JWT Expiration Too Long or Missing Refresh Logic
**What goes wrong:** JWT expires after 30 days (default); user loses session while actively using app, or session persists too long after password change.
**Why it happens:** Developers accept default maxAge without considering security/UX tradeoffs.
**How to avoid:** Set appropriate JWT expiration (7 days for web apps); implement session refresh on activity; invalidate sessions on password change.
**Warning signs:** Users complain about random logouts; sessions persist after password reset.

### Pitfall 9: Role Checks Using String Comparison Vulnerable to Typos
**What goes wrong:** Code checks `session.user.role === "adimn"` (typo) and silently fails, granting viewer permissions to admin.
**Why it happens:** Roles stored as strings without type safety; easy to mistype in conditionals.
**How to avoid:** Define role enum/type in TypeScript; use helper functions like `requireRole(["admin"])` that validate against enum.
**Warning signs:** Role checks scattered across codebase as string literals; inconsistent capitalization ("Admin" vs "admin").

### Pitfall 10: Missing Error Handling in authorize() Callback
**What goes wrong:** Uncaught errors in `authorize()` callback crash auth flow; users see generic "CredentialsSignin" error without context.
**Why it happens:** Developers don't wrap database queries or password verification in try/catch.
**How to avoid:** Wrap all async operations in authorize() in try/catch; return null on errors; log errors for debugging.
**Warning signs:** Auth crashes when database is down; no logs when login fails.

## Code Examples

Verified patterns from official sources:

### User Signup with Tenant Creation
```typescript
// src/app/(auth)/signup/actions.ts
"use server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/passwords"
import { signIn } from "@/auth"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
})

export async function signup(formData: FormData) {
  try {
    const data = signupSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
      organizationName: formData.get("organizationName"),
    })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return { error: "Email already registered" }
    }

    // Hash password
    const passwordHash = await hashPassword(data.password)

    // Create tenant and user atomically
    await prisma.$transaction(async (tx) => {
      // Create organization/tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.organizationName,
          slug: data.organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        },
      })

      // Create first user as admin
      await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: "admin",
          tenantId: tenant.id,
        },
      })
    })

    // Auto-login after successful signup
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/dashboard",
    })

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error("Signup error:", error)
    return { error: "An error occurred during signup" }
  }
}
```

### Loading User Workspaces with RLS
```typescript
// src/app/(protected)/dashboard/page.tsx
import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.tenantId) {
    redirect("/login")
  }

  // Load workspaces for the user's tenant using RLS
  const workspaces = await tenantQuery(session.user.tenantId, async (db) => {
    return db.workspace.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { mappingConfigs: true },
        },
      },
    })
  })

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Organization: {session.user.tenantId}</p>

      <h2>Your Workspaces</h2>
      {workspaces.map((workspace) => (
        <div key={workspace.id}>
          <h3>{workspace.name}</h3>
          <p>{workspace._count.mappingConfigs} mappings</p>
        </div>
      ))}
    </div>
  )
}
```

### Save Mapping Configuration
```typescript
// src/app/(protected)/workspace/[workspaceId]/mapper/actions.ts
"use server"
import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const saveMappingSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sourceSchemaId: z.string().uuid(),
  targetSchemaId: z.string().uuid(),
  mappingData: z.record(z.any()), // Field-to-field mapping JSON
  workspaceId: z.string().uuid(),
})

export async function saveMappingConfig(data: z.infer<typeof saveMappingSchema>) {
  const session = await auth()

  if (!session?.user?.tenantId || !session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Validate editor or admin role
  if (!["admin", "editor"].includes(session.user.role)) {
    throw new Error("Only admins and editors can save mappings")
  }

  const validated = saveMappingSchema.parse(data)

  const mapping = await tenantQuery(session.user.tenantId, async (db) => {
    // Verify workspace belongs to this tenant
    const workspace = await db.workspace.findUnique({
      where: { id: validated.workspaceId },
    })

    if (!workspace) {
      throw new Error("Workspace not found")
    }

    // Create mapping configuration
    return db.mappingConfig.create({
      data: {
        name: validated.name,
        description: validated.description,
        sourceSchemaId: validated.sourceSchemaId,
        targetSchemaId: validated.targetSchemaId,
        mappingData: validated.mappingData,
        workspaceId: validated.workspaceId,
        createdById: session.user.id,
        status: "draft",
      },
    })
  })

  revalidatePath(`/workspace/${validated.workspaceId}`)

  return { success: true, mappingId: mapping.id }
}
```

### Load Mapping Configuration
```typescript
// src/app/(protected)/workspace/[workspaceId]/mapper/[mappingId]/page.tsx
import { auth } from "@/auth"
import { tenantQuery } from "@/lib/rls"
import { redirect, notFound } from "next/navigation"

export default async function MapperPage({
  params,
}: {
  params: { workspaceId: string; mappingId: string }
}) {
  const session = await auth()

  if (!session?.user?.tenantId) {
    redirect("/login")
  }

  const mapping = await tenantQuery(session.user.tenantId, async (db) => {
    return db.mappingConfig.findUnique({
      where: { id: params.mappingId },
      include: {
        sourceSchema: true,
        targetSchema: true,
        workspace: true,
      },
    })
  })

  if (!mapping || mapping.workspaceId !== params.workspaceId) {
    notFound()
  }

  // Check read permissions (all roles can view)
  const canEdit = ["admin", "editor"].includes(session.user.role)

  return (
    <div>
      <h1>{mapping.name}</h1>
      <p>Workspace: {mapping.workspace.name}</p>
      {/* Pass mapping data to React Flow canvas component */}
      <MappingCanvas
        mapping={mapping}
        canEdit={canEdit}
      />
    </div>
  )
}
```

### Role-Based Access Control in Middleware
```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const session = req.auth
  const path = req.nextUrl.pathname

  // Public routes
  if (path.startsWith("/login") || path.startsWith("/signup")) {
    // Redirect authenticated users away from auth pages
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", path)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only routes
  if (path.startsWith("/admin") && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js v4 | Auth.js v5 (next-auth@beta) | 2024-2025 | Rebranded for framework-agnostic support; breaking changes in adapter imports (@auth/* vs @next-auth/*) |
| bcrypt password hashing | Argon2id | 2023-2026 | Argon2id became recommended standard due to memory-hardness resisting GPU attacks |
| Database sessions | JWT sessions for credentials | Ongoing | JWT required for credentials provider; database sessions only for OAuth; edge runtime compatibility |
| API Routes for mutations | Server Actions | Next.js 13+ (2023) | Server Actions eliminate boilerplate, provide automatic type safety, work with Server Components |
| Custom session libraries | Auth.js ecosystem | 2021-present | Auth.js (formerly NextAuth) became de facto standard for Next.js apps |
| Client-side routing for auth | Middleware protection | Next.js 12+ (2022) | Middleware runs before page render, preventing flash of protected content |

**Deprecated/outdated:**
- **next-iron-session**: Replaced by iron-session v8+; old package no longer maintained
- **NextAuth v4 adapter imports**: Use `@auth/prisma-adapter` not `@next-auth/prisma-adapter` in v5
- **getSession() from next-auth/client**: Use `auth()` from config file in App Router
- **MD5, SHA-1, SHA-256 for passwords**: Never acceptable; use Argon2id or bcrypt minimum
- **pages/api/auth/[...nextauth].ts**: App Router uses `app/api/auth/[...nextauth]/route.ts`

## Open Questions

1. **Should we implement email verification for new signups?**
   - What we know: Auth.js provides VerificationToken model and email provider support
   - What's unclear: Whether this phase requires email verification or if it's deferred to later
   - Recommendation: Start without email verification (simpler MVP); add in future phase if required

2. **Should we implement password reset flow?**
   - What we know: Not explicitly listed in requirements; common SaaS feature
   - What's unclear: Whether PLAT-01 implies full account management or just basic signup
   - Recommendation: Defer to future phase; focus on core requirements (signup, login, logout, RBAC)

3. **Should workspace access be shared across users in the same organization?**
   - What we know: Requirements say "Each organization has isolated workspaces" (PLAT-05)
   - What's unclear: Whether users in same org share workspaces or each user has private workspaces
   - Recommendation: Workspaces belong to organization (tenant), all users in org can access; RBAC controls edit vs view

4. **Should we implement workspace-level permissions (separate from org-level roles)?**
   - What we know: Requirements specify org-level roles (admin, editor, viewer)
   - What's unclear: Whether individual workspaces can have custom permissions per user
   - Recommendation: Use org-level roles only in Phase 7; workspace-level permissions can be added later if needed

5. **Should we implement session expiration/refresh for long-running sessions?**
   - What we know: JWT default expiration is 30 days; Auth.js supports session refresh
   - What's unclear: What expiration time is appropriate for this application
   - Recommendation: Use 7-day expiration with automatic refresh on activity; log out after 7 days of inactivity

## Sources

### Primary (HIGH confidence)
- [Auth.js Official Documentation](https://authjs.dev) - Installation, credentials provider, session strategies, RBAC, Prisma adapter
- [Auth.js Credentials Provider](https://authjs.dev/getting-started/authentication/credentials) - Authorize function, password handling
- [Auth.js Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma) - Database integration, required models
- [Auth.js Protecting Routes](https://authjs.dev/getting-started/session-management/protecting) - Middleware patterns, session verification
- [Auth.js Role-Based Access Control](https://authjs.dev/guides/role-based-access-control) - Role storage, session callbacks
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Official Next.js recommendations
- Existing Phase 1 implementation: `src/lib/rls.ts` - tenantQuery pattern

### Secondary (MEDIUM confidence)
- [Top 5 authentication solutions for secure Next.js apps in 2026](https://workos.com/blog/top-authentication-solutions-nextjs-2026) - Auth library comparison
- [Complete Authentication Guide for Next.js App Router in 2025](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router) - App Router patterns
- [Password Hashing Guide 2025: Argon2 vs Bcrypt](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) - Hashing algorithm comparison
- [Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions) - Server Actions best practices
- [Building a Scalable RBAC System in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa) - RBAC implementation patterns
- [Securing Multi-Tenant Applications Using Row Level Security in PostgreSQL with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) - RLS integration patterns
- [Next.js Security Hardening: Five Steps to Bulletproof Your App in 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e) - Security best practices
- [Should I Use Server Actions Or APIs?](https://www.pronextjs.dev/should-i-use-server-actions-or-apis) - Server Actions vs Route Handlers decision framework

### Tertiary (LOW confidence - marked for validation)
- [Next.js Session Management: Solving NextAuth Persistence Issues in 2025](https://clerk.com/articles/nextjs-session-management-solving-nextauth-persistence-issues) - Session troubleshooting (Clerk-focused)
- [Multi tenancy best practices](https://github.com/vercel/next.js/discussions/20841) - Community discussion (2021, may be outdated)
- [@tomfreudenberg/next-auth-mock](https://github.com/TomFreudenberg/next-auth-mock) - Testing library (verify compatibility with v5)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Auth.js v5 is official Next.js recommendation, Argon2id is 2026 security standard, verified through official docs
- Architecture: HIGH - Patterns verified through Auth.js official docs and existing Phase 1 RLS implementation
- Pitfalls: MEDIUM-HIGH - Common pitfalls sourced from community discussions, security guides, and Auth.js GitHub issues
- Code examples: HIGH - Examples based on official Auth.js documentation and existing codebase patterns

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - authentication patterns are relatively stable; Auth.js v5 is in beta but stable API)

**Notes:**
- Auth.js v5 is currently in beta (`next-auth@beta`) but is production-ready and recommended over v4
- Existing RLS infrastructure from Phase 1 provides strong foundation for multi-tenant security
- Server Actions are preferred over API Routes for internal mutations per Next.js 2026 best practices
- Argon2id is the current password hashing standard, replacing bcrypt recommendations from 2020-2023 era
