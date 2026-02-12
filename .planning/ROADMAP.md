# Roadmap: MessageMapper

## Overview

MessageMapper evolves from project scaffolding through a pluggable format parsing architecture, visual field mapping interface with transformations, intelligent auto-mapping assistance, multi-tenant platform infrastructure, and advanced format support. Each phase delivers coherent capabilities that build toward the complete visual message mapping platform enabling clients to map fields between any two message formats and save those mappings for reuse.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Infrastructure** - Project scaffolding, database schema, multi-tenant architecture with Row-Level Security
- [x] **Phase 2: Format Parser Registry** - Pluggable parser architecture with XML and JSON format support
- [ ] **Phase 3: Visual Mapping Interface** - Side-by-side panel UI with drag-and-drop field connections using React Flow
- [ ] **Phase 4: Mapping Operations & UX** - Search, filter, expand/collapse, undo/redo, zoom/pan for large schemas
- [ ] **Phase 5: Transformation System** - Format conversion, concatenation, splitting, constants, conditional logic, lookup tables, custom JavaScript
- [ ] **Phase 6: Validation & Testing** - Type mismatch detection, required field validation, mapping preview with sample data
- [ ] **Phase 7: Platform Features** - Full authentication, role-based access control, workspace management

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Establish project foundation with multi-tenant database architecture and critical architectural decisions that cannot be changed later
**Depends on**: Nothing (first phase)
**Requirements**: None (foundational infrastructure)
**Success Criteria** (what must be TRUE):
  1. Next.js 14+ application runs locally with TypeScript strict mode enabled
  2. PostgreSQL database schema exists with multi-tenant Row-Level Security policies active
  3. Prisma schema generates TypeScript types for all data models
  4. Application can be deployed to free-tier cloud infrastructure (Neon or Supabase)
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js project with TypeScript strict mode, App Router, and environment configuration
- [x] 01-02-PLAN.md — Define multi-tenant Prisma schema and create RLS-aware client infrastructure
- [x] 01-03-PLAN.md — Apply SQL RLS policies, verify tenant isolation, and configure Neon + Vercel deployment

### Phase 2: Format Parser Registry
**Goal**: Create pluggable parser architecture that converts any format into normalized field trees
**Depends on**: Phase 1
**Requirements**: PARS-01, PARS-02, PARS-03, PARS-08
**Success Criteria** (what must be TRUE):
  1. User can upload an XSD schema file and see its field structure parsed into a navigable tree
  2. User can upload a sample XML message and have its structure inferred automatically
  3. User can upload a JSON schema or sample JSON and see its field structure parsed
  4. User sees validation errors when uploading a malformed schema or sample
  5. All parsers produce the same normalized FieldNode structure with id, name, path, type, required flag, and children
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — FieldNode types, parser registry, normalization utilities, and JSON parsers (TDD)
- [x] 02-02-PLAN.md — XML sample parser and XSD schema parser (TDD)
- [x] 02-03-PLAN.md — API route for file upload, parser registration, and integration tests

### Phase 3: Visual Mapping Interface
**Goal**: Deliver core visual mapping value loop with side-by-side panel interface where users can draw field connections
**Depends on**: Phase 2
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-10, MAP-11
**Success Criteria** (what must be TRUE):
  1. User sees source fields on the left panel and target fields on the right panel
  2. User can draw a connector from a source field to a target field to create a 1:1 mapping
  3. User can expand and collapse nested field structures for XML elements and JSON objects
  4. User can see mapping status on each field showing mapped, unmapped, or partially mapped state
  5. User can delete individual mapping connections
**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md — Install React Flow, create mapper page with file upload and schema display
- [ ] 03-02-PLAN.md — Custom field tree nodes with expand/collapse and per-field connection handles
- [ ] 03-03-PLAN.md — Connection drawing, validation, deletion, and mapping status indicators
- [ ] 03-04-PLAN.md — Fix state isolation bug: lift useMappingState to single instance for field visibility (gap closure)

### Phase 4: Mapping Operations & UX
**Goal**: Enable efficient navigation and manipulation of large schemas with hundreds of fields
**Depends on**: Phase 3
**Requirements**: MAP-04, MAP-05, MAP-06, MAP-07, MAP-08
**Success Criteria** (what must be TRUE):
  1. User can search and filter fields by name in both source and target panels
  2. User can see which fields are required versus optional with visual indicators
  3. User can see field data types displayed on each field (string, number, date, boolean)
  4. User can undo and redo mapping actions
  5. User can zoom and pan the mapping canvas for large schemas without browser performance degradation
**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — Search/filter fields by name with debounced input, color-coded type badges, and enhanced required/optional indicators
- [ ] 04-02-PLAN.md — Undo/redo state management with Zustand + Zundo temporal middleware and toolbar UI
- [ ] 04-03-PLAN.md — Human verification of all Phase 4 features (search, indicators, undo/redo, zoom/pan)

### Phase 5: Transformation System
**Goal**: Enable field transformations beyond simple 1:1 mapping with format conversion, split/concatenate, conditional logic, and lookup tables
**Depends on**: Phase 4
**Requirements**: XFRM-01, XFRM-02, XFRM-03, XFRM-04, XFRM-05, XFRM-06, XFRM-07
**Success Criteria** (what must be TRUE):
  1. User can apply format conversion on a mapping for date formats, number formats, and currency codes
  2. User can concatenate multiple source fields into one target field with configurable separator
  3. User can split one source field into multiple target fields using delimiter or regex
  4. User can set a constant value for a target field that is not sourced from input
  5. User can define conditional mapping rules where if source field equals X, map to Y, otherwise map to Z
  6. User can create and manage lookup tables for code translation between systems
  7. User can write custom JavaScript transformation functions for edge cases with sandbox isolation
**Plans**: TBD

Plans:
- [ ] 05-01: TBD during phase planning

### Phase 6: Validation & Testing
**Goal**: Provide validation feedback and testing capabilities so users can verify mapping correctness before production use
**Depends on**: Phase 5
**Requirements**: VAL-01, VAL-02
**Success Criteria** (what must be TRUE):
  1. User sees validation errors for type mismatches and missing required field mappings
  2. User can test a mapping with sample data and see the transformed output
**Plans**: TBD

Plans:
- [ ] 06-01: TBD during phase planning

### Phase 7: Platform Features
**Goal**: Enable multi-tenant SaaS operation with authentication, role-based access control, and workspace management
**Depends on**: Phase 1
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07, PLAT-08
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password
  2. User can log in and maintain a session across browser refreshes
  3. User can log out from any page
  4. Admin can assign roles (admin, editor, viewer) to users in their organization
  5. Each organization has isolated workspaces that other organizations cannot access
  6. User can create, rename, and organize mapping configurations within workspaces
  7. User can save mapping configurations and load them later
  8. Editor role can create and edit mappings while viewer role has read-only access
**Plans**: TBD

Plans:
- [ ] 07-01: TBD during phase planning
