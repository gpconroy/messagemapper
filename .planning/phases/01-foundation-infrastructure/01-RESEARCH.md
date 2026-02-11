# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-02-11
**Domain:** Next.js 14+ with TypeScript, PostgreSQL multi-tenant RLS, Prisma ORM, Cloud deployment
**Confidence:** HIGH

## Summary

Phase 1 establishes a Next.js 14+ full-stack application with TypeScript strict mode, PostgreSQL database with Row-Level Security for multi-tenant isolation, Prisma ORM for type-safe database access, and deployment readiness for free-tier cloud infrastructure (Neon or Supabase).

The stack leverages Next.js 16.1 (latest stable as of Feb 2026) with App Router, which provides server components, server actions, and end-to-end TypeScript type safety when paired with Prisma. PostgreSQL RLS enforces data isolation at the database level, making it resilient to application-layer bugs. Prisma Client Extensions enable transparent RLS through a factory pattern that wraps queries in tenant-scoped transactions.

Critical architectural decisions in this phase cannot be changed later: multi-tenant architecture (shared database with RLS vs. database-per-tenant), TypeScript strict mode (difficult to enable after codebase grows), and project structure (App Router conventions).

**Primary recommendation:** Use Next.js 16.1 with App Router, TypeScript strict mode, Prisma 5+ with RLS extensions, and deploy to Neon for database branching support that mirrors Vercel preview deployments.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1+ | Full-stack React framework | Latest stable (Dec 2025), App Router with React 19.2, server components, server actions, built-in TypeScript support |
| TypeScript | 5.1.3+ | Type safety | Required for async server components, strict mode catches errors at compile-time, generates types from Prisma schema |
| Prisma | 5.x | ORM and type generator | Industry standard for TypeScript + PostgreSQL, generates fully-typed client, handles migrations, supports RLS via extensions |
| PostgreSQL | 15+ | Relational database | Required for Row-Level Security policies, supported by all major free-tier providers, mature RLS implementation |
| React | 19.2 | UI library | Bundled with Next.js 16.1, Server Components stable, required for App Router features |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @prisma/client | 5.x | Generated database client | Auto-installed by Prisma, regenerated on schema changes |
| @prisma/adapter-pg | Latest | PostgreSQL adapter for Prisma | Required for connection pooling with Neon/Supabase serverless |
| Neon SDK | Latest | Neon-specific features | If using Neon: database branching, serverless driver |
| ESLint | Latest | Code linting | Pre-configured by create-next-app, enforces Next.js best practices |
| Turbopack | Bundled | Dev server bundler | Default in Next.js 16, faster than Webpack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neon | Supabase | Supabase includes auth/storage/realtime (more features), but Neon has superior branching for preview deployments |
| Prisma | Drizzle ORM | Drizzle is lighter/faster but less mature, smaller ecosystem, weaker migration tooling |
| PostgreSQL RLS | Application-layer auth | App-layer is easier initially but vulnerable to code bugs, doesn't scale to mobile apps or multiple clients |
| App Router | Pages Router | Pages Router is mature/stable but lacks Server Components, Server Actions, and streaming—deprecated for new projects |

**Installation:**
```bash
# Initialize Next.js project with TypeScript
npx create-next-app@latest --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"

# Install Prisma
npm install prisma @prisma/client @prisma/adapter-pg --save-dev

# Initialize Prisma with PostgreSQL
npx prisma init --datasource-provider postgresql
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/                     # Next.js App Router (routes, layouts, pages)
│   ├── (auth)/             # Route group: authentication routes
│   ├── (dashboard)/        # Route group: authenticated app routes
│   ├── api/                # API routes (if needed beyond Server Actions)
│   ├── layout.tsx          # Root layout with <html> and <body>
│   └── page.tsx            # Home page (/)
├── lib/                     # Shared utilities, helpers, constants
│   ├── prisma.ts           # Prisma Client singleton (CRITICAL)
│   ├── auth.ts             # Authentication helpers
│   └── rls.ts              # RLS extension factory
├── components/              # Reusable React components
│   ├── ui/                 # Base UI components (buttons, inputs)
│   └── features/           # Feature-specific components
├── types/                   # Shared TypeScript types
└── prisma/                  # Prisma schema and migrations
    ├── schema.prisma       # Database schema
    └── migrations/         # Migration history (commit to git)
```

**Key conventions:**
- Use `src/` folder to separate code from config files
- Route groups `(name)` organize routes without affecting URLs
- Private folders `_folder` for non-routable utilities
- Colocate route-specific components inside route folders when appropriate

### Pattern 1: Prisma Client Singleton
**What:** Single Prisma Client instance reused across hot reloads in development
**When to use:** Always—prevents connection pool exhaustion
**Example:**
```typescript
// Source: https://www.prisma.io/docs/guides/nextjs
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Pattern 2: Multi-Tenant RLS with Prisma Extensions
**What:** Wrap queries in tenant-scoped transactions using PostgreSQL runtime parameters
**When to use:** Every database query in multi-tenant app
**Example:**
```typescript
// Source: https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security
// lib/rls.ts
import { prisma } from './prisma'

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

// Usage in Server Component or Server Action:
// const db = tenantClient(session.user.tenantId)
// const projects = await db.project.findMany()
```

### Pattern 3: TypeScript Strict Mode
**What:** Enable all strict type-checking options in tsconfig.json
**When to use:** From project initialization—very hard to add later
**Example:**
```json
// tsconfig.json (generated by create-next-app)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "skipLibCheck": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### Pattern 4: PostgreSQL RLS Policies
**What:** Database-level policies that filter rows based on session variables
**When to use:** Every table that contains tenant-specific data
**Example:**
```sql
-- Source: AWS Multi-tenant RLS guide
-- Enable RLS on table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's projects
CREATE POLICY tenant_isolation_policy ON projects
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Policy: Bypass for admin queries (optional)
CREATE POLICY bypass_rls_policy ON projects
  USING (current_setting('app.bypass_rls', TRUE)::text = 'true');

-- Auto-populate tenant_id on INSERT
ALTER TABLE projects
  ALTER COLUMN tenant_id
  SET DEFAULT current_setting('app.current_tenant_id', TRUE)::uuid;
```

### Pattern 5: Environment Variables
**What:** Secure configuration using .env files
**When to use:** All secrets, database URLs, and environment-specific config
**Example:**
```bash
# .env.local (not committed to git)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# .env (committed to git, with placeholders)
DATABASE_URL="postgresql://localhost:5432/dev"
```

### Anti-Patterns to Avoid
- **New PrismaClient() in multiple files:** Causes connection pool exhaustion—use singleton pattern
- **Mixing App Router and Pages Router:** Choose one—mixing creates confusion and prevents using new features
- **Application-layer tenant filtering (WHERE tenant_id = ?):** Vulnerable to bugs—use database RLS instead
- **Superuser database connections in production:** Bypasses RLS—create limited user without BYPASSRLS privilege
- **Manual TypeScript types for database models:** Prisma generates these—never hand-write them
- **Prisma Client in client components:** Database access only in Server Components/Actions—client can't connect to database

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Custom SQL scripts with version tracking | Prisma Migrate | Handles migration history, rollbacks, team sync, schema validation automatically |
| Multi-tenant data isolation | WHERE clauses in every query | PostgreSQL RLS | Application bugs can't bypass database-enforced policies |
| TypeScript types for database | Hand-written interfaces | Prisma Client generation | Auto-updates on schema changes, 100% accurate, includes relations |
| Connection pooling | Custom pool manager | Prisma with PG adapter | Handles serverless connection limits, auto-reconnect, graceful shutdown |
| Authentication session management | Custom JWT/session store | NextAuth.js or Clerk | Handles security edge cases, CSRF protection, session refresh |
| Environment variable validation | Manual process.env checks | Zod or t3-env | Type-safe env vars, fails fast on missing/invalid vars |

**Key insight:** Multi-tenant security, database schema changes, and TypeScript type generation are deceptively complex with edge cases that mature libraries have already solved. Attempting to build these from scratch will lead to security vulnerabilities (RLS), slow iteration (migrations), and type errors (manual interfaces).

## Common Pitfalls

### Pitfall 1: Connection Pool Exhaustion in Development
**What goes wrong:** "Too many database connections" error during Next.js hot reload
**Why it happens:** Each hot reload creates new PrismaClient() instance, each opening connection pool (default: num_cpus * 2 + 1)
**How to avoid:** Use globalThis singleton pattern (see Architecture Patterns)
**Warning signs:** Database connection errors appearing on file save, slow dev server

### Pitfall 2: Superuser Bypassing RLS
**What goes wrong:** RLS policies silently ignored, all data visible across tenants
**Why it happens:** PostgreSQL superusers and table owners bypass RLS by design
**How to avoid:** Create limited database user without BYPASSRLS privilege for application connections
**Warning signs:** Cross-tenant data leaking in queries, policies not being applied

### Pitfall 3: Forgetting to Set Tenant Context
**What goes wrong:** Queries return no rows or leak cross-tenant data
**Why it happens:** RLS extension requires tenant ID set before each transaction, easy to forget in new routes
**How to avoid:** Create middleware or helper that forces tenant context, never use raw prisma directly
**Warning signs:** Empty result sets in development, Sentry errors about missing context

### Pitfall 4: Using migrate dev in Production
**What goes wrong:** Database schema reset, all data lost
**Why it happens:** `prisma migrate dev` is designed to reset and seed dev databases
**How to avoid:** Use `prisma migrate deploy` in production, never run migrate dev outside local environment
**Warning signs:** None—this is catastrophic if it happens

### Pitfall 5: Environment Variables Not Loaded
**What goes wrong:** DATABASE_URL undefined, connection failures
**Why it happens:** .env.local not in .gitignore, or using wrong file name (.env vs .env.local)
**How to avoid:** Use .env.local for secrets (auto-loaded by Next.js), commit .env with placeholder values
**Warning signs:** "DATABASE_URL is not defined" errors, build failures in CI/CD

### Pitfall 6: Complex RLS Policies with Subqueries
**What goes wrong:** Extremely slow queries, database CPU spikes
**Why it happens:** Subqueries in RLS policies execute for every row, creating N+1 query problems at database level
**How to avoid:** Keep RLS policies simple (single column equality checks), use indexed columns
**Warning signs:** Query times >1s for simple lookups, EXPLAIN ANALYZE showing sequential scans

### Pitfall 7: Geographic Latency
**What goes wrong:** All requests take 200-500ms minimum
**Why it happens:** Next.js server in US-East, database in EU-West—every query crosses Atlantic
**How to avoid:** Deploy all services (Next.js, database) in same geographic region
**Warning signs:** Consistent latency floor regardless of query complexity

### Pitfall 8: N+1 Query Problems with Includes
**What goes wrong:** Page loads require 100+ database queries, slow response times
**Why it happens:** Using include/select without understanding query execution, loading relations in loops
**How to avoid:** Use Prisma's include strategically, batch queries where possible, monitor query counts
**Warning signs:** DevTools showing many sequential queries, Prisma query logs showing repeated patterns

## Code Examples

Verified patterns from official sources:

### Initialize Next.js with TypeScript
```bash
# Source: https://nextjs.org/docs/app/getting-started/installation
npx create-next-app@latest my-app --typescript --app --tailwind --eslint

# Recommended prompts:
# ✔ Would you like to use TypeScript? Yes
# ✔ Would you like to use ESLint? Yes
# ✔ Would you like to use Tailwind CSS? Yes (optional)
# ✔ Would you like your code inside a `src/` directory? Yes
# ✔ Would you like to use App Router? Yes
# ✔ Would you like to use Turbopack for `next dev`? Yes
# ✔ Would you like to customize the import alias? @/*
```

### Prisma Schema for Multi-Tenant App
```prisma
// Source: Prisma RLS examples + Multi-tenant guides
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  projects  Project[]
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}

model Project {
  id        String   @id @default(uuid())
  name      String
  tenantId  String   // Auto-populated by RLS policy
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}
```

### RLS Setup SQL Migration
```sql
-- Source: https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security
-- migrations/XXXXXX_enable_rls/migration.sql

-- Create limited user (run manually as superuser)
-- CREATE USER app_user WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE your_db TO app_user;
-- GRANT USAGE ON SCHEMA public TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_policy ON "User"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::text);

CREATE POLICY tenant_isolation_policy ON "Project"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::text);

-- Auto-populate tenantId on INSERT
ALTER TABLE "User"
  ALTER COLUMN "tenantId"
  SET DEFAULT current_setting('app.current_tenant_id', TRUE)::text;

ALTER TABLE "Project"
  ALTER COLUMN "tenantId"
  SET DEFAULT current_setting('app.current_tenant_id', TRUE)::text;
```

### Server Action with RLS
```typescript
// Source: Next.js official docs + Prisma RLS extension pattern
// app/actions/projects.ts
'use server'

import { tenantClient } from '@/lib/rls'
import { auth } from '@/lib/auth' // Your auth solution

export async function createProject(formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const db = tenantClient(session.user.tenantId)

  const project = await db.project.create({
    data: {
      name: formData.get('name') as string,
      // tenantId auto-populated by RLS default
    },
  })

  return project
}
```

### Next.js Config with TypeScript
```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Fail build on type errors
    ignoreBuildErrors: false,
  },
  experimental: {
    // Enable typed environment variables
    typedEnv: true,
  },
}

export default nextConfig
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router | App Router | Next.js 13 (2022), stable in 14 (2023) | Server Components, Server Actions, streaming, layouts—Pages Router deprecated for new projects |
| getServerSideProps | Server Components | Next.js 13 | Simpler data fetching, no serialization needed, end-to-end type safety |
| API routes for mutations | Server Actions | Next.js 13/14 | Progressive enhancement, automatic revalidation, better DX |
| Manual env validation | typed-env or Zod | 2024-2025 | Type-safe process.env at compile time, fail fast on misconfiguration |
| Database-per-tenant | Shared DB with RLS | Ongoing trend | Lower cost, simpler ops, built-in isolation—RLS matured in PG 9.5+ |
| Webpack | Turbopack | Next.js 16 (default) | 5-10x faster dev server, incremental bundling |
| React 18 | React 19 | Next.js 16 (Oct 2025) | Stable Server Components, improved streaming, automatic memoization |

**Deprecated/outdated:**
- **Pages Router:** Still supported but lacks Server Components, Server Actions—use App Router for new projects
- **prisma.$queryRaw for tenant filtering:** Use RLS extensions instead—more secure, less error-prone
- **getStaticProps/getServerSideProps:** Replaced by Server Components and route segment config
- **_app.tsx and _document.tsx:** Replaced by root layout.tsx in App Router

## Open Questions

1. **Authentication Provider**
   - What we know: Next.js doesn't include auth, need to choose provider (NextAuth.js, Clerk, Auth0, etc.)
   - What's unclear: User hasn't specified which auth solution to use
   - Recommendation: Defer to Phase 2 (Authentication), but design database schema to support common patterns (email/password, OAuth, magic links)

2. **Neon vs Supabase Final Choice**
   - What we know: Both offer free tiers, PostgreSQL-compatible, support RLS
   - What's unclear: Neon has better branching (mirrors Vercel previews), Supabase includes more features (auth, storage, realtime)
   - Recommendation: Use Neon for pure database needs, Supabase if auth/storage/realtime needed—prior decisions suggest Neon for branching

3. **Workspace Isolation Level**
   - What we know: Requirements specify "multi-tenant with client workspaces"
   - What's unclear: Should workspaces be sub-tenants (tenant > workspace > user) or are workspace = tenant?
   - Recommendation: Model workspace as tenant for simplicity—rename Tenant to Workspace in schema

4. **File Upload Strategy**
   - What we know: Requirements include uploading XSD, XML, JSON, CSV, SQL files
   - What's unclear: Store files in database (bytea) or object storage (S3/Supabase Storage)?
   - Recommendation: Defer to later phase—use object storage for files >1MB, database for schemas/metadata

## Sources

### Primary (HIGH confidence)
- [Next.js Official Docs - Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) - Verified 2026-02-09, v16.1.6
- [Next.js Official Docs - TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) - Verified 2026-02-09, v16.1.6
- [Prisma Official Docs - Next.js Guide](https://www.prisma.io/docs/guides/nextjs) - Singleton pattern, PG adapter setup
- [Prisma GitHub - RLS Extension Example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) - Official RLS implementation
- [Next.js Blog - Next.js 15](https://nextjs.org/blog/next-15) - Released Oct 2024, Turbopack, React 19
- [Next.js Docs - Upgrading to v16](https://nextjs.org/docs/app/guides/upgrading/version-16) - Latest version info

### Secondary (MEDIUM confidence)
- [AWS Blog - Multi-tenant RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) - Architectural patterns, verified by multiple sources
- [Vercel KB - Next.js + Prisma + Postgres](https://vercel.com/kb/guide/nextjs-prisma-postgres) - Deployment guide
- [Neon vs Supabase Comparison](https://vela.simplyblock.io/neon-vs-supabase/) - 2025 comparison, verified with official docs
- [Medium - Prisma Singleton Pattern](https://medium.com/@truongtronghai/globalthis-declare-global-and-the-solution-of-singleton-prisma-client-7706a769c9d3) - Explains globalThis usage
- [Permit.io - Postgres RLS Guide](https://www.permit.io/blog/postgres-rls-implementation-guide) - Common pitfalls, best practices

### Tertiary (LOW confidence)
- [Bytebase - RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/) - Pitfall examples (blog post, single source)
- Various Medium/blog posts on Next.js structure - Used for pattern discovery, verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs, version numbers confirmed
- Architecture: HIGH - Patterns from official Prisma/Next.js documentation and examples
- Pitfalls: MEDIUM-HIGH - Mix of official warnings (HIGH) and community reports (MEDIUM), cross-verified where possible

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days, stable ecosystem)

**Notes:**
- Next.js 16.1 is latest stable as of Dec 2025
- Prisma 5.x is current major version
- PostgreSQL RLS patterns are stable since PG 9.5 (2016)
- React 19.2 bundled with Next.js 16.1
- All WebSearch results included year (2026) to ensure currency
