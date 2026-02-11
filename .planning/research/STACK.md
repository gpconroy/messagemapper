# Stack Research: MessageMapper

## Recommended Stack

### Core Framework
- **Next.js 14+** (App Router) — Full-stack React framework
  - Rationale: Single codebase, shared TypeScript types between frontend and backend, built-in API routes, server components for initial page loads
  - Confidence: HIGH

### Visual Mapping UI
- **React Flow (@xyflow/react) v12** — Node-based UI library for interactive diagrams
  - Rationale: Purpose-built for node-and-edge interfaces. Supports custom nodes, handles, edge types, minimap, zoom/pan. Used by Stripe, Typeform, and many data pipeline tools. Perfect for side-by-side field mapping with connectors.
  - Alternatives considered: D3.js (too low-level, would require building interaction layer from scratch), jsPlumb (dated, smaller community), GoJS (commercial license, expensive)
  - Confidence: HIGH

### Database
- **PostgreSQL** via **Neon** (free tier: 0.5 GB storage, 190 compute hours/month)
  - Rationale: Neon offers generous free tier, branching for dev/prod, serverless scaling. Supabase is also viable but adds abstraction layers you may not need.
  - Alternative: Supabase (PostgreSQL + auth + realtime, but more opinionated)
  - Confidence: HIGH

### ORM / Database Access
- **Prisma v5+** — TypeScript ORM
  - Rationale: Excellent TypeScript types auto-generated from schema, migrations, works well with Next.js and PostgreSQL. Schema-as-code aligns with a project that's all about schemas.
  - Alternative: Drizzle ORM (lighter weight, SQL-like syntax, better performance) — viable if Prisma feels heavy
  - Confidence: HIGH

### Authentication
- **NextAuth.js (Auth.js) v5** — Authentication for Next.js
  - Rationale: Native Next.js integration, supports credentials + OAuth providers, session management, role-based access patterns. Free, well-maintained.
  - Alternative: Clerk (polished UI components but paid at scale), Supabase Auth (if using Supabase for DB)
  - Confidence: HIGH

### XML Parsing
- **fast-xml-parser v4** — XML to JSON parser for Node.js
  - Rationale: Handles large XML documents efficiently, preserves attributes and namespaces (critical for ISO20022), configurable parsing options. Pure JS, no native dependencies.
  - Alternative: xml2js (older, callback-based), saxes (streaming, lower-level)
  - Confidence: HIGH

### XSD Schema Parsing
- **libxmljs2** or custom XSD parser — For parsing XML Schema Definitions
  - Rationale: XSD parsing is complex (types, references, restrictions). libxmljs2 provides full schema validation. For field extraction, a custom lightweight parser using fast-xml-parser on the XSD itself may be simpler.
  - Note: This is the trickiest part of the stack — XSD parsing in JavaScript is not well-served by existing libraries. Plan for custom work here.
  - Confidence: MEDIUM

### CSV Parsing
- **Papa Parse v5** — CSV parser
  - Rationale: Handles edge cases (quoted fields, delimiters in values), streaming for large files, browser and Node.js compatible.
  - Confidence: HIGH

### UI Components
- **shadcn/ui** — Copy-paste component library built on Radix UI + Tailwind CSS
  - Rationale: Full ownership of components (not a dependency), accessible, customizable, professional look. Tables, dialogs, dropdowns, forms all included.
  - Alternative: Ant Design (heavier, more opinionated), Material UI (Google aesthetic, heavy bundle)
  - Confidence: HIGH

### Styling
- **Tailwind CSS v3+** — Utility-first CSS
  - Rationale: Fast development, consistent design system, works perfectly with shadcn/ui. No CSS-in-JS runtime overhead.
  - Confidence: HIGH

### State Management
- **Zustand v4** — Lightweight state management
  - Rationale: Simple API, minimal boilerplate, works well for complex UI state like mapping configurations, undo/redo support. React Flow examples use Zustand.
  - Alternative: React Context (fine for simple state, struggles with complex mapping state), Redux (overkill)
  - Confidence: HIGH

### Form Handling
- **React Hook Form + Zod** — Form validation
  - Rationale: Zod schemas double as runtime validation and TypeScript types. React Hook Form is performant for complex forms (transformation config, lookup tables).
  - Confidence: HIGH

## What NOT to Use

| Technology | Why Not |
|-----------|---------|
| D3.js for mapping UI | Too low-level — you'd spend weeks building what React Flow gives you |
| MongoDB | Schema-less doesn't fit a project about schemas and structured mappings |
| GraphQL | REST/server actions are simpler for this domain; no complex nested queries needed |
| Electron/desktop app | Web-first for multi-tenant access; desktop adds deployment complexity |
| Socket.io / real-time | Not needed for v1 — mappings are saved, not streamed |
| Heavy XML libraries (Saxon-JS) | Overkill for schema parsing; adds large bundle size |

## Development Tools

- **TypeScript** (strict mode) — Non-negotiable for a data-structure mapping tool
- **ESLint + Prettier** — Code quality
- **Vitest** — Unit testing (faster than Jest, native ESM)
- **Playwright** — E2E testing for the visual mapping UI

---
*Researched: 2026-02-11*
*Confidence: HIGH overall, MEDIUM for XSD parsing (limited JS ecosystem)*
