# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Clients can visually map fields between any two message formats and save those mappings for reuse — making system integration visible, configurable, and repeatable.
**Current focus:** Phase 2: Format Parser Registry

## Current Position

Phase: 2 of 10 (Format Parser Registry)
Plan: 2 of 3 in current phase (02-01, 02-02 complete)
Status: In progress
Last activity: 2026-02-11 — Completed plan 02-02 (XML and XSD parsers)

Progress: [████░░░░░░] 38%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~469s (7.8 minutes)
- Total execution time: ~1.4 hours

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 01 | 3/3 | ✅ Complete |
| 02 | 2/3 | 🔄 In Progress |

**Recent Completions:**
| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01 | 77s | 2 | 9 |
| 01-02 | 876s | 2 | 5 |
| 01-03 | manual | 2 | 4 |
| 02-01 | 469s | 2 | 9 |
| 02-02 | 1217s | 2 | 5 |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Next.js full-stack chosen for shared TypeScript types ideal for data-structure mapping
- Phase 1: Side-by-side panel UI pattern more intuitive than node canvas for field mapping
- Phase 1: PostgreSQL free cloud tier for cost-effective scalability
- Phase 1: Multi-tenant with client workspaces for external client isolation
- Plan 01-01: TypeScript strict mode enabled from day one (retrofitting later is extremely difficult)
- Plan 01-01: Environment variables split (.env committed for docs, .env.local gitignored for secrets)
- Plan 01-01: Application-level types (src/types/) separate from Prisma-generated types
- Plan 01-02: Prisma 7 configuration pattern (datasource config in prisma.config.ts instead of schema)
- Plan 01-02: FormatSchema.tenantId nullable for shared library schemas across tenants
- Plan 01-02: MappingConfig.mappingData as Json type for flexible mapping structure
- Plan 01-02: Prisma Client singleton with globalThis caching prevents connection pool exhaustion
- Plan 01-03: Created app_user role without BYPASSRLS (neondb_owner bypasses all RLS policies)
- Plan 01-03: Changed tenantClient API to tenantQuery with interactive transactions for guaranteed same-connection execution
- Plan 01-03: Library schemas with tenantId=NULL accessible to all tenants for shared ISO20022/industry formats
- Plan 02-01: Custom $ref resolver instead of ESM-only @apidevtools/json-schema-ref-parser for Jest compatibility
- Plan 02-02: Parse XSD as XML with fast-xml-parser instead of native libxmljs2-xsd for client-side compatibility
- Plan 02-02: Use @ prefix for XML/XSD attributes (e.g., "order@id") to distinguish from elements
- Plan 02-02: Strip namespace prefixes with removeNSPrefix for cleaner display names

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 2 (Format Parser Registry):**
- ~~XSD schema parsing has limited JavaScript ecosystem support — needs spike to evaluate libxmljs2 vs custom parser vs server-side approach~~ **RESOLVED:** Implemented XSD parser using fast-xml-parser parse-as-XML approach (Plan 02-02)

**Phase 5 (Transformation System):**
- Custom JavaScript transformation functions require sandbox isolation (VM2, isolated-vm, or WebAssembly) — security critical

**Phase 8 (Intelligence & Quality):**
- Auto-mapping algorithm selection needs research — multiple approaches possible (Levenshtein, soundex, semantic NLP, type scoring)

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 02-02-PLAN.md (XML and XSD parsers with TDD)
Resume file: None
Next: Plan 02-03 (Wire up parsers to schema upload API endpoints)
