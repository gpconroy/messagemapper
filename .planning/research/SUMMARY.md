# Project Research Summary

**Project:** MessageMapper - Visual Message Mapping Platform
**Domain:** Data Integration / Visual Mapping Tools
**Researched:** 2026-02-11
**Overall Confidence:** MEDIUM (limited by unavailable web research tools)

## Executive Summary

MessageMapper is a visual message mapping platform for translating data between formats (XML, JSON, CSV) with a drag-and-drop interface. Expert builders in this space use pluggable parser architectures, separate logical mapping models from UI state, and focus relentlessly on performance optimization for large schemas. The competitive landscape is bifurcated - enterprise tools (MuleSoft, Boomi, Informatica) are powerful but expensive and complex, while simple tools lack team collaboration and reusability features. MessageMapper's opportunity lies in the mid-market sweet spot: visually intuitive with strong collaboration and pattern reuse.

The recommended approach is a Next.js 14+ full-stack application using React Flow for the visual canvas, PostgreSQL with Prisma for data persistence, and a pluggable parser architecture from day one. The core abstraction is a normalized field tree that all parsers produce - this enables format-agnostic mapping logic. Critical risks include storing mapping logic as serialized UI state (prevents server-side execution and code generation), missing multi-tenant isolation at the database level (security breach risk), and performance bottlenecks with large schemas (browser rendering and N+1 query patterns).

Success hinges on three architectural decisions made in Phase 1: (1) separating logical mapping representation from visual UI state, (2) implementing parser plugin architecture even if only 2 formats are initially supported, and (3) database-level tenant isolation via PostgreSQL Row-Level Security. Getting these right enables scaling to complex enterprise use cases; getting them wrong requires rewrites.

## Key Findings

### Recommended Stack

The stack research achieved HIGH confidence for most technologies due to clear alignment between visual mapping requirements and established tooling patterns. Next.js 14+ with App Router provides full-stack TypeScript sharing between frontend and backend. React Flow v12 is purpose-built for node-and-edge interfaces and used by major platforms like Stripe. PostgreSQL via Neon offers generous free tier with serverless scaling. Prisma provides excellent TypeScript types auto-generated from schema, perfect for a schema-focused application.

**Core technologies:**
- **Next.js 14+ (App Router)**: Full-stack framework — single codebase, shared TypeScript types, built-in API routes
- **React Flow v12**: Visual canvas library — purpose-built for node-based UIs with custom nodes, handles, edge types
- **PostgreSQL (Neon)**: Database — generous free tier (0.5 GB storage, 190 compute hours/month), serverless scaling
- **Prisma v5+**: ORM — auto-generated TypeScript types from schema, migrations, schema-as-code philosophy
- **NextAuth.js v5**: Authentication — native Next.js integration, supports credentials + OAuth, role-based access
- **fast-xml-parser v4**: XML parsing — handles large documents efficiently, preserves namespaces (critical for ISO20022)
- **shadcn/ui + Tailwind CSS**: UI components — full ownership, accessible, professional look
- **Zustand v4**: State management — lightweight, minimal boilerplate, works well for complex mapping state and undo/redo

**Technology with MEDIUM confidence:**
- **XSD Schema Parsing**: Limited JavaScript ecosystem support — libxmljs2 for full validation or custom lightweight parser using fast-xml-parser on XSD files. This is the trickiest part of the stack and requires custom work.

**What to avoid:**
- D3.js (too low-level for mapping UI needs), MongoDB (schema-less doesn't fit), GraphQL (REST simpler for this domain), Socket.io for v1 (mappings saved not streamed), heavy XML libraries like Saxon-JS (overkill, large bundles)

### Expected Features

Feature research achieved LOW confidence due to inability to verify current competitive platforms, but the categorization framework (table stakes vs differentiators) is based on established data mapping platform patterns and likely still valid.

**Must have (table stakes):**
- Visual drag-and-drop field-to-field mapping with side-by-side source/target view
- Field concatenation (N:1) and basic format conversion (string/number/date/boolean)
- Multi-format support (start with XML and JSON; defer CSV to Phase 3+)
- Mapping preview/test with validation error display
- Save/load mapping configurations for reusability
- Search/filter fields (essential for large schemas with hundreds of fields)
- Undo/redo, required field indicators, data type indicators
- Mapping status indicators (mapped/unmapped/partially mapped visual feedback)

**Should have (competitive differentiators):**
- Auto-mapping suggestions (AI/heuristic field matching saves 50-70% of initial mapping time)
- Unmapped gap analysis (proactive visual heat map of missing mappings)
- Reusable mapping templates (save common patterns like "address block" as components)
- Mapping version history (audit trail for enterprise compliance requirements)
- Lookup table support (currency codes, country codes - common in financial integrations)
- Field hierarchy visualization (nested XML/JSON structures as collapsible trees)
- Conditional mapping (if/then logic for advanced use cases)

**Defer (v2+):**
- CSV support (less common in financial messaging; add based on demand)
- Real-time collaboration (very high complexity, not critical for MVP)
- Custom transformation functions (security risk, consider later)
- Import from code (XSLT/DataWeave parsers - niche use case, very high complexity)
- Workflow orchestration, data connectors, scheduling (scope creep into iPaaS territory)

**Anti-features (explicitly avoid):**
Core principle - MessageMapper is a mapping tool, not an integration platform. Avoid: built-in data connectors, workflow orchestration, data quality/cleansing rules, master data management, embedded database, scheduling/job execution, multi-step transformation chains, visual query builder. Stay focused on visual field-to-field mapping with transformations. Let users integrate into existing pipelines.

### Architecture Approach

Architecture research achieved HIGH confidence for overall patterns, MEDIUM for XSD parsing complexity. The system has four major subsystems built on a core abstraction: the normalized field tree. All formats (XML, JSON, CSV, SQL) parse into the same FieldNode structure with id, name, path, type, required flag, children, and format-specific metadata. This abstraction enables format-agnostic mapping logic.

**Major components:**
1. **Format Parser Registry (pluggable)** — Parse any format into normalized field tree. Plugin interface with parseSchema, validateSample methods. Build first (everything depends on it). New formats added by implementing FormatParser interface without core changes.
2. **Mapping Engine** — Define, store, validate, and execute field-to-field mappings with transformation chains. Data model includes MappingConfig, FieldMapping, TransformChain, TransformStep. Transformation types: format conversion, split (1:N), concat (N:1), conditional, lookup, custom.
3. **Visual Mapping UI (React Flow)** — Side-by-side panel interface with source schema (left), mapping lines (center), target schema (right). Custom nodes for fields, edges for mappings, transformation config panel. Zustand store for state management with undo/redo stack.
4. **Platform Layer (Multi-Tenant)** — Authentication, tenancy, workspaces, RBAC, schema library. Tenant model: Organization > Workspace > Mapping Config. Roles: Admin, Editor, Viewer. Schema library with pre-loaded schemas (ISO20022, common APIs) and custom uploads.

**Key architecture principles:**
- Normalized field tree is core abstraction — parsers produce them, engine maps them, UI renders them
- Parsers are plugins — adding a format means implementing one interface, no core changes
- Transforms are pipelines — chain of steps, each with typed config, easy to add new types
- Tenant isolation at data layer — every query filters by organizationId, no cross-tenant leakage
- Schema versioning — mappings reference specific schema versions, drift detection warns when schemas update

**Build order:**
1. Project scaffolding + DB schema (foundation)
2. Format Parser Registry + XML/JSON parsers (core abstraction)
3. Mapping Engine data model + CRUD (logical layer)
4. Visual Mapping UI with React Flow (depends on parser + engine)
5. Transformation system (enhances mappings)
6. Auth + Multi-tenancy (can be stubbed early, full implementation here)
7. Schema Library (pre-loaded + custom upload)
8. Gap analysis + reporting (builds on completed mapping system)
9. CSV + SQL format parsers (extend parser registry)
10. Polish, testing, deployment (production readiness)

### Critical Pitfalls

Pitfall research achieved LOW confidence (training data only), but findings represent common patterns from established ETL tools and visual programming platforms.

1. **Storing mapping logic as serialized UI state** — Separating logical representation (DAG with nodes/edges) from visual representation (canvas coordinates) in database schema. Logical model must be executable without UI context. Otherwise: cannot execute server-side, cannot generate code, UI framework changes require data migration. **Prevention:** Store mappings as directed acyclic graphs with separate ui_metadata. **Phase 1 critical - cannot fix later without migration.**

2. **Parser extensibility as afterthought** — Define FormatParser plugin interface from day one even if only implementing XML/JSON initially. Prevents having to rewrite core engine when adding ISO20022 flavors, SWIFT MT, HL7, EDI X12. **Prevention:** Core engine works with normalized SchemaDefinition, never raw formats. **Address in Phase 1 or 2.**

3. **Transformation logic without execution context isolation** — Sandboxing custom transformation functions with VM2, isolated-vm, or WebAssembly. Execution timeouts, memory limits, no access to process/require/globals. Consider expression-based DSL instead of full programming language. **Prevention:** Isolated worker processes for user code with whitelisted API surface. **Phase 1 critical if allowing custom transformations.**

4. **Schema version changes break existing mappings** — Schema versioning built into data model. Mappings reference schema + version, not just schema. Schema comparison tools detect breaking vs non-breaking changes. Migration UI for field renames. **Prevention:** Add version column to schemas table, mappings track source_schema_version and target_schema_version. **Phase 1 foundation - retrofitting requires migration.**

5. **N+1 queries for large dataset transformations** — Preload lookup tables into memory before processing rows. Streaming parser with chunked execution (1000 rows at a time). Performance budgets in tests (10K rows in <5 seconds). **Prevention:** Batch-aware transformation execution, no per-record database queries. **Address in Phase 2-3 after basic mapping works.**

6. **Visual connector rendering kills browser with large schemas** — Virtual scrolling for field lists (only render visible DOM nodes), lazy rendering with collapsed nested structures by default, canvas viewport culling (only render connectors in visible area). **Prevention:** React-window or custom virtualization, 60fps target with 1000+ field schemas. **Phase 1 UI design - fixing later requires UI rewrite.**

7. **Multi-tenancy via application-level filtering** — PostgreSQL Row-Level Security enforces tenant isolation at database level. Set session variable per request (app.current_workspace). Impossible to forget filter. **Prevention:** ALTER TABLE ENABLE ROW LEVEL SECURITY with workspace_id policies. **Phase 1 foundation - cannot retrofit secure multi-tenancy.**

8. **Circular dependency detection missing** — Topological sort validation on mapping save. Detect cycles using depth-first search with visited tracking. Show cycle path in error: "Circular dependency: A → B → C → A". **Prevention:** Fail fast at design time, not runtime. **Phase 1-2 when transformation dependencies implemented.**

## Implications for Roadmap

Based on research, suggested 4-phase structure prioritizing foundation architecture, core mapping value loop, intelligent assistance differentiators, and collaboration features:

### Phase 1: Foundation & Core Mapping
**Rationale:** Establish critical architectural decisions that cannot be changed later without rewrites. Deliver basic but complete mapping value loop (upload schemas → map fields → preview → save → reuse). Focus on correctness over features.

**Delivers:** Working visual mapping tool for XML and JSON with basic transformations.

**Core deliverables:**
- Project scaffolding (Next.js 14+, PostgreSQL, Prisma, TypeScript strict mode)
- Database schema with multi-tenant isolation (Row-Level Security from day one)
- Format Parser Registry with plugin interface (even if only XML/JSON initially)
- XML and JSON parsers producing normalized field trees
- Mapping Engine with logical DAG representation (separate from UI state)
- Basic transformation types: format conversion, field concatenation (N:1), constant values
- Visual Mapping UI using React Flow (side-by-side panels, drag-and-drop connections)
- Save/load mapping configurations with schema versioning
- Mapping preview/test with sample data
- Validation error display (unmapped required fields, type mismatches)
- Search/filter fields in large schemas
- Undo/redo for mapping changes
- Basic authentication (NextAuth.js credentials provider)

**Avoids critical pitfalls:**
- Pitfall 1: Logical mapping model separate from UI state (enables server-side execution)
- Pitfall 2: Parser plugin architecture (enables format additions without core changes)
- Pitfall 4: Schema versioning in data model (prevents breaking existing mappings)
- Pitfall 6: Virtual scrolling for field lists (handles large schemas without browser crash)
- Pitfall 7: Row-Level Security for tenant isolation (prevents data leaks)

**Research needs:** Standard patterns, skip `/gsd:research-phase` unless team unfamiliar with React Flow or Prisma.

### Phase 2: Intelligence & Quality
**Rationale:** Add features that differentiate from basic mapping tools. Focus on reducing manual work (auto-mapping suggestions) and preventing errors (gap analysis, validation). These features deliver high ROI and competitive advantage without excessive complexity.

**Delivers:** Smart mapping assistant that saves 50-70% of manual mapping time and proactively identifies quality issues.

**Core deliverables:**
- Auto-mapping suggestions (name similarity algorithms: Levenshtein, type matching, confidence scores)
- Unmapped gap analysis (visual heat map showing mapping completeness)
- Field splitting transformation (1:N, inverse of concatenation)
- Lookup table support (CSV/Excel upload, in-memory caching, fallback handling)
- Mapping version history (snapshots on save, diff visualization, rollback)
- Schema validation on upload (catch malformed XML/JSON early)
- Field hierarchy visualization (collapsible trees for nested structures)
- Zoom/pan canvas controls (minimap optional)
- Mapping status indicators (visual completeness tracking)
- Enhanced validation rules (amount precision, date formats for financial domain)

**Uses stack elements:**
- Zustand for complex auto-mapping suggestion state
- React Hook Form + Zod for lookup table upload forms
- fast-xml-parser configuration for namespace handling (ISO20022)

**Implements architecture:**
- Extends transformation pipeline with split and lookup transform types
- Version control integrated into Mapping Engine
- Gap analysis algorithm in validation layer

**Avoids pitfalls:**
- Pitfall 5: Preload lookup tables into memory (batch operations, not N+1 queries)
- Pitfall 10: Cache invalidation strategy for lookup tables
- Pitfall 14: Explicit type conversion nodes (no implicit lossy coercion)

**Research needs:** Phase likely needs `/gsd:research-phase` for auto-mapping algorithms (string similarity, semantic matching approaches, confidence scoring systems).

### Phase 3: Collaboration & Templates
**Rationale:** Enable team workflows and pattern reuse. Infrastructure for SaaS business model. Addresses enterprise requirements (audit trail, team workspaces, reusable components). Conditional logic handles complex edge cases.

**Delivers:** Multi-user platform with template library enabling cross-team knowledge sharing.

**Core deliverables:**
- Reusable mapping templates (save common patterns as parameterized components)
- Multi-tenant infrastructure fully implemented (workspace management, user invitations)
- Team collaboration features (comments, sharing, permissions)
- Conditional mapping (if/then logic with expression builder UI)
- Mapping test suite (saved test cases with expected outputs, regression testing)
- Bulk field operations (multi-select, batch transformations)
- Expression builder UI (visual interface vs raw code for transforms)
- CSV format parser (extend parser registry)
- Mapping execution history and audit trail
- OAuth providers for authentication (GitHub, Google)

**Uses stack elements:**
- NextAuth.js OAuth providers
- Prisma relations for workspace/user/permission models
- Papa Parse for CSV handling

**Implements architecture:**
- Full platform layer (tenancy, workspaces, RBAC)
- Template library subsystem (storage, parameterization, instantiation)
- Conditional transform type in transformation pipeline

**Avoids pitfalls:**
- Pitfall 8: Circular dependency detection (validate conditional mapping DAGs)
- Pitfall 9: Execution history for audit trail (compliance requirement)
- Pitfall 13: Import/export between workspaces (template portability)

**Research needs:** Phase likely needs `/gsd:research-phase` for:
- Template parameterization patterns (how to make templates flexible yet safe)
- Expression builder UI libraries and grammar design
- Conditional logic evaluation engine patterns

### Phase 4: Advanced Features & Scale
**Rationale:** Power user features, extensibility, and production readiness. Code generation enables integration with existing pipelines. Performance optimization for enterprise-scale usage.

**Delivers:** Production-ready platform with code generation, custom extensions, and performance optimization.

**Core deliverables:**
- Export to code (generate XSLT, JavaScript, Python from mappings)
- Custom transformation functions (sandboxed execution with VM2/isolated-vm)
- Mapping documentation export (PDF/HTML reports for auditors)
- SQL DDL format parser (database schema mapping)
- Dependency graph visualization (show transformation dependencies)
- Performance metrics (execution time, bottleneck identification)
- Dark mode (developer tool expectation)
- Keyboard shortcuts (power user efficiency)
- Advanced caching and optimization (streaming for large files)
- Production monitoring and error tracking

**Uses stack elements:**
- VM2 or isolated-vm for sandboxed custom functions
- Monaco editor for code transformation editor
- Playwright for E2E testing of complex mapping workflows

**Implements architecture:**
- Code generation module (transforms logical DAG to executable code)
- Custom transform type in pipeline with sandbox isolation
- Performance profiling layer

**Avoids pitfalls:**
- Pitfall 3: Execution context isolation (sandbox custom transformation code)
- Pitfall 12: Transformation testing infrastructure (independent testability)
- Pitfall 15: Preview execution optimization (debounced, sample data only)

**Research needs:** Phase likely needs `/gsd:research-phase` for:
- Code generation strategies (AST construction, template engines)
- Sandboxing approaches (VM2 vs isolated-vm vs QuickJS vs WASM)
- Performance optimization patterns for large-scale transformations

### Phase Ordering Rationale

- **Phase 1 foundation is non-negotiable** — Seven critical pitfalls must be addressed in foundation phase. Logical mapping model, parser plugin architecture, schema versioning, multi-tenant isolation, and performance-conscious UI rendering are architectural decisions that cannot be changed later without rewrites.

- **Phase 2 delivers competitive differentiation early** — Auto-mapping suggestions and gap analysis are high-value features that reduce manual work by 50-70%. These are the differentiators that justify the platform vs writing custom scripts. Getting these into users' hands quickly validates the value proposition.

- **Phase 3 enables business model** — Multi-tenant infrastructure with workspaces and RBAC unlocks SaaS revenue model. Template library creates network effects (teams share patterns, increasing platform stickiness). Deferring real-time collaboration to Phase 4+ or never (very high complexity, questionable ROI).

- **Phase 4 serves power users and enterprise** — Code generation and custom transformations serve advanced use cases. Not required for core value delivery, but important for large customers with complex integration needs. Performance optimization targets enterprise scale (10K+ row datasets).

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Auto-mapping):** String similarity algorithms, semantic matching approaches, confidence scoring systems. Limited established patterns for visual mapping domain specifically. Recommend `/gsd:research-phase` for algorithm research.
- **Phase 3 (Templates & Expressions):** Template parameterization patterns, expression builder grammar design, conditional evaluation engines. Niche requirements, not well-documented. Recommend `/gsd:research-phase`.
- **Phase 4 (Code Gen & Sandboxing):** Code generation AST patterns, sandboxing security approaches, WASM vs VM2 trade-offs. Complex security considerations. Recommend `/gsd:research-phase`.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Next.js + React Flow + Prisma are well-documented with extensive examples. Multi-tenant patterns in PostgreSQL are established. Standard web application architecture.
- **Phase 2 (Lookup Tables):** Simple key-value caching patterns, well-understood performance considerations.
- **Phase 3 (Multi-tenant Platform):** NextAuth.js OAuth is standard, workspace RBAC patterns are established in SaaS applications.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Technologies well-matched to requirements. React Flow proven for node-based UIs. Next.js + Prisma + PostgreSQL is battle-tested stack. XSD parsing is MEDIUM confidence (limited JS ecosystem). |
| Features | LOW | Could not verify current competitive platforms (research cutoff January 2025, no web access). Feature categorization framework sound but specific competitive intelligence stale. Table stakes vs differentiators based on long-standing industry patterns likely still valid. |
| Architecture | HIGH | Normalized field tree abstraction is core insight enabling pluggable parsers and format-agnostic mapping. Component boundaries clear. Build order dependencies well-defined. MEDIUM confidence for XSD parsing complexity. |
| Pitfalls | LOW | Based on training data patterns from ETL tools and visual programming platforms. Common anti-patterns well-documented but specific to MessageMapper context inferred rather than verified. All findings should be validated against current best practices. |

**Overall confidence:** MEDIUM

Research was severely limited by unavailable web research tools (WebSearch, WebFetch, Context7). All findings based on training data with January 2025 cutoff. The architectural patterns and technology choices are sound based on established platform patterns, but specific competitive intelligence and current best practices need verification.

### Gaps to Address

**Critical gaps requiring validation during implementation:**

1. **XSD Schema Parsing Approach** — Limited JavaScript ecosystem for XSD parsing. Needs spike to determine: (a) libxmljs2 full validation vs (b) custom lightweight parser using fast-xml-parser on XSD files vs (c) server-side Java/Python XSD parser via API. Decision impacts Phase 1 XML parser implementation.

2. **Auto-mapping Algorithm Selection** — Multiple approaches possible (Levenshtein string distance, soundex, semantic NLP, type compatibility scoring). Needs research into existing open-source implementations and performance benchmarks. Phase 2 research-phase should evaluate trade-offs.

3. **Template Parameterization Design** — How to make templates flexible (parameterized) yet safe (prevent breaking changes). Needs study of similar systems (Terraform modules, CloudFormation templates, code snippet libraries). Phase 3 research-phase should prototype approaches.

4. **Sandboxing Security Model** — Custom transformation functions are high-value but high-risk. VM2 vs isolated-vm vs QuickJS vs WebAssembly trade-offs need evaluation. Phase 4 research-phase should include security review.

5. **Current Competitive Feature Sets** — Research could not verify 2026 capabilities of Altova MapForce, MuleSoft DataWeave, Dell Boomi, Informatica. Product team should conduct competitive analysis to validate table stakes features and identify new differentiators.

6. **Real-Time Collaboration Value vs Complexity** — Research flagged as "very high complexity, defer unless critical." Needs user research to determine if multi-user simultaneous editing is essential for target market or if async collaboration (version history, comments) suffices.

**Non-critical gaps (acceptable to resolve during implementation):**

- Performance optimization strategies for >1000 field schemas (can benchmark and iterate)
- Expression builder UI library selection (multiple viable options: react-querybuilder, json-rules-engine)
- Mapping documentation export template format (can design based on user feedback)
- Dark mode implementation details (standard Tailwind CSS patterns)

**Confidence-building recommendations for roadmap planning:**

1. Grant web research permissions for higher-confidence competitive intelligence
2. Conduct user interviews to validate table stakes features for target market (SMB financial integration teams)
3. Technical spikes for critical gaps (XSD parsing, auto-mapping algorithms) during Phase 1 planning
4. Treat FEATURES.md as hypothesis document requiring validation with product team research
5. Review React Flow official examples and Zustand patterns for visual canvas state management

## Sources

### Primary (HIGH confidence)

**Stack technologies:**
- Next.js, React Flow, PostgreSQL, Prisma, NextAuth.js, fast-xml-parser, Tailwind CSS, shadcn/ui, Zustand — all based on official documentation knowledge and widespread production usage patterns from training data
- Neon PostgreSQL free tier specifications (0.5 GB storage, 190 compute hours/month)
- React Flow usage by Stripe, Typeform for node-based interfaces

**Architecture patterns:**
- Normalized field tree abstraction pattern (common in ETL tools: Apache NiFi, Talend)
- Plugin architecture for format parsers (established extensibility pattern)
- Multi-tenant Row-Level Security in PostgreSQL (documented best practice)

### Secondary (MEDIUM confidence)

**Feature patterns:**
- Table stakes features inferred from data mapping platform patterns (Altova MapForce, MuleSoft, Dell Boomi) based on training data through January 2025
- Auto-mapping algorithm approaches (string similarity, type matching) based on general ML/NLP patterns
- Transformation pipeline patterns from ETL tool architectures

### Tertiary (LOW confidence, requires validation)

**Competitive intelligence:**
- Altova MapForce, MuleSoft DataWeave, Dell Boomi, Informatica feature sets as of 2024-2025 (may have changed)
- Pricing models and market positioning (rapidly evolving market)
- Emerging players since January 2025 (unknown)
- Current user expectations for table stakes features in 2026 (not verified)

**Domain-specific patterns:**
- ISO20022 mapping complexity (namespace handling, deep nesting, repeating elements) based on financial messaging standard knowledge
- Financial integration audit requirements (version history, test evidence) inferred from compliance patterns

**Technical implementation details:**
- XSD parsing library ecosystem (requires verification of libxmljs2 vs alternatives)
- Sandbox security approaches (VM2 vs isolated-vm current status, vulnerabilities, maintenance)
- React Flow performance with 1000+ nodes (requires benchmarking)
- Auto-mapping algorithm performance trade-offs (requires testing)

---

**Research completed:** 2026-02-11
**Ready for roadmap:** Yes (with noted confidence limitations)

**Recommendation for orchestrator:** Proceed to requirements definition and roadmap creation. Use phase structure and research flags as starting point. Flag XSD parsing, auto-mapping algorithms, and competitive feature validation for deeper investigation during phase planning. Architecture foundation is solid despite web research limitations.
