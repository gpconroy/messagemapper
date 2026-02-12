# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Clients can visually map fields between any two message formats and save those mappings for reuse — making system integration visible, configurable, and repeatable.
**Current focus:** Phase 6: Validation & Testing

## Current Position

Phase: 6 of 7 (Validation & Testing)
Plan: 3 of 4 in current phase (06-01, 06-03 complete)
Status: In Progress
Last activity: 2026-02-12 — Completed plan 06-03 (Validation Feedback UI)

Progress: [█████████░] 84%

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: ~457s (7.6 minutes)
- Total execution time: ~3.8 hours

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 01 | 3/3 | ✅ Complete |
| 02 | 3/3 | ✅ Complete |
| 03 | 3/4 | 🔄 In Progress |
| 04 | 3/3 | ✅ Complete |
| 05 | 5/6 | 🔄 In Progress |
| 06 | 1/4 | 🔄 In Progress |

**Recent Completions:**
| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 04-01 | 261s | 2 | 4 |
| 04-02 | 411s | 2 | 5 |
| 04-03 | 2 min | 1 | 1 |
| 05-01 | 1493s (25 min) | 1 (TDD) | 7 |
| 05-02 | 492s (8 min) | 2 | 4 |
| 05-03 | 353s (6 min) | 1 (TDD) | 4 |
| 05-04 | 609s (10 min) | 2 | 8 |
| 05-05 | 276s (4.6 min) | 2 | 9 |
| 06-01 | 344s (5.7 min) | 1 (TDD) | 7 |
| 06-03 | 348s (5.8 min) | 2 | 6 |

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
- Plan 02-03: Parser barrel export registers all 4 parsers at module initialization
- Plan 02-03: API route accepts format override via form field for explicit format specification
- Plan 02-03: 5MB file size limit prevents server resource exhaustion
- Plan 03-01: React Flow named export instead of default export to avoid TypeScript JSX errors
- Plan 03-01: MappingNodeData extends Record<string, unknown> for React Flow type compatibility
- Plan 03-01: Fixed-position nodes (draggable: false) to keep source/target panels in place
- Plan 03-01: ReactFlowProvider wraps entire mapper page for hook context availability
- Plan 03-02: Expansion state stored separately from React Flow node data to prevent collapse during re-renders
- Plan 03-02: FieldTreeItem isExpanded prop is a function, not boolean, for correct recursive child expansion
- Plan 03-02: Handles shown on leaf fields and collapsed parents, hidden on expanded parents
- Plan 03-02: nodeTypes defined at module level to prevent React Flow warning about changing types
- [Phase 03-04]: Lifted useMappingState() to MapperContent parent component to eliminate duplicate state instances
- [Phase 03-04]: MappingCanvas receives all state via props instead of calling hooks directly
- Plan 04-01: Search filtering uses recursive algorithm - parent matches show all children, child matches show parent chain
- Plan 04-01: 300ms debounce delay prevents excessive re-filtering during typing
- Plan 04-01: Auto-expand matching paths when search is active for immediate visibility
- Plan 04-01: Type color map provides distinct colors per type (8 types with unique colors)
- Plan 04-01: Required fields use red left border plus asterisk for dual visual reinforcement
- Plan 04-02: Zustand with Zundo temporal middleware for undo/redo instead of custom history implementation
- Plan 04-02: Only connections tracked in undo/redo history, not schema state (partialize limits tracking)
- Plan 04-02: 50-entry history limit prevents unbounded memory growth
- Plan 04-02: useMappingState acts as bridge between Zustand store and React Flow interface
- Plan 04-02: Support both Ctrl+Shift+Z and Ctrl+Y for redo (cross-platform conventions)
- Plan 04-03: All Phase 4 UX enhancements verified working by human tester (search/filter, visual indicators, undo/redo, zoom/pan)
- Plan 05-01: Used date-fns instead of moment.js (not deprecated, modern ESM support)
- Plan 05-01: Used native Intl.NumberFormat for number/currency formatting (97%+ browser support, no library needed)
- Plan 05-01: Implemented ReDoS protection via regex pattern whitelist for string split operations
- Plan 05-01: All transform functions are pure (no side effects, no DB access) for composability
- Plan 05-01: Strict type checking with descriptive errors (fail fast on invalid input)
- Plan 05-02: Used Json type for TransformationRule.config to support type-specific configuration flexibility
- Plan 05-02: Added order field to TransformationRule for deterministic pipeline execution
- Plan 05-02: Enforced unique constraint on (tenantId, name) for LookupTable to prevent duplicate names per tenant
- Plan 05-02: Used hardcoded DEV_TENANT_ID fallback in API routes until Phase 7 authentication
- Plan 05-02: Fixed Next.js 15+ async params pattern for dynamic routes (params is Promise)
- Plan 05-03: Use isolated-vm instead of vm2 for JavaScript sandbox (vm2 has multiple critical CVEs)
- Plan 05-03: Default timeout 5000ms and memory limit 128MB for custom JS transformations
- Plan 05-03: ExternalCopy.copyInto() for input isolation preventing sandbox from modifying caller data
- Plan 05-03: Track disposed state to prevent double-dispose errors on memory limit failures
- Plan 05-04: Fixed Zod v4 compatibility: z.record(z.string(), z.unknown()) instead of z.record(z.unknown())
- Plan 05-04: Pipeline collects all errors instead of stopping at first failure
- Plan 05-04: Dry-run mode returns original data unchanged while recording transformation outputs
- Plan 05-04: Pipeline sorts rules by order field before execution for deterministic behavior
- Plan 05-05: Excluded lookup and custom_js from transformation dialog - reserved for Plan 06 dedicated UI
- Plan 05-05: TransformationBadge uses single-letter or short abbreviations for compact edge display
- Plan 05-05: ConstantForm includes type selector with value coercion (string/number/boolean/null)
- Plan 05-05: StringOpForm uses radio toggle to switch between split and concatenate modes
- Plan 06-01: Constant value type inference returns 'number' for all numeric values (not distinguishing integer)
- Plan 06-01: ValidationError type shared between required-fields and validate-mapping modules for consistency
- Plan 06-01: Transformation output type inference traces through chains sequentially for accurate final type determination
- Plan 06-01: Leaf-field-only validation - only leaf fields (no children) are checked for required field coverage
- Plan 06-03: ValidationPanel expands by default when errors exist, collapses when valid for unobtrusive UX
- Plan 06-03: Field error indicators use simple dot with title tooltip instead of complex hover UI for compact display
- Plan 06-03: Bottom panel layout (validation + preview) with toggle keeps canvas area maximized
- Plan 06-03: 500ms debounce prevents excessive validation runs during rapid connection changes

### Pending Todos

1. **Complete Phase 3 human verification testing** (testing) — 9 visual/interactive tests need human verification before continuing with plan 03-03

### Blockers/Concerns

**Phase 2 (Format Parser Registry):**
- ~~XSD schema parsing has limited JavaScript ecosystem support — needs spike to evaluate libxmljs2 vs custom parser vs server-side approach~~ **RESOLVED:** Implemented XSD parser using fast-xml-parser parse-as-XML approach (Plan 02-02)

**Phase 5 (Transformation System):**
- ~~Custom JavaScript transformation functions require sandbox isolation (VM2, isolated-vm, or WebAssembly) — security critical~~ **RESOLVED:** Implemented secure sandbox using isolated-vm with V8 Isolate, timeout, and memory limits (Plan 05-03)

**Phase 8 (Intelligence & Quality):**
- Auto-mapping algorithm selection needs research — multiple approaches possible (Levenshtein, soundex, semantic NLP, type scoring)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | make the MessageMapper green on the top of the web application | 2026-02-12 | 440e117 | [1-make-the-messagemapper-green-on-the-top-](./quick/1-make-the-messagemapper-green-on-the-top-/) |
| 2 | add direct passthrough transformation type for 1:1 field mapping | 2026-02-12 | 49baa1e | [2-in-some-cases-i-simply-want-to-map-one-f](./quick/2-in-some-cases-i-simply-want-to-map-one-f/) |
| 3 | fix blank space beside field tree scrollbar | 2026-02-12 | 9cc8918 | [3-in-the-loaded-files-there-is-a-vertical-](./quick/3-in-the-loaded-files-there-is-a-vertical-/) |

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed plan 06-03 (Validation Feedback UI)
Resume file: None
Next: Continue Phase 6 with plan 06-04 (Human Verification)
