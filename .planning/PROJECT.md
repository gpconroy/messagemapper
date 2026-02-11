# MessageMapper

## What This Is

A multi-tenant visual message mapping platform that lets clients map fields between different message formats — ISO20022 XML, TransferMate JSON APIs, CSV, SQL schemas, and more. Clients use a side-by-side panel interface to draw connections between source and target fields, apply transformations, identify unmapped gaps, and save reusable mapping configurations. Built for system interoperability.

## Core Value

Clients can visually map fields between any two message formats and save those mappings for reuse — making system integration visible, configurable, and repeatable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Side-by-side panel UI with visual connectors between source and target fields
- [ ] Parse source schemas from XSD/schema files and sample messages (XML, JSON, CSV)
- [ ] Pre-loaded library of common message types (ISO20022 pacs.008, TransferMate Payment API, etc.)
- [ ] Custom format upload — clients can add their own schemas/samples
- [ ] Field transformations: format conversion, split/concatenate, conditional logic, lookup tables
- [ ] Visual indicators for unmapped fields (gaps between source and target)
- [ ] Exportable gap reports listing fields that can't carry across between formats
- [ ] Save and load mapping configurations
- [ ] Client workspaces — each client has their own space with multiple mapping configs
- [ ] Organization by message type within each client workspace
- [ ] Full authentication with user accounts and login
- [ ] Role-based access control per client workspace
- [ ] Extensible format system — adding new message format parsers without rewriting core

### Out of Scope

- Real-time message translation/processing — this is a mapping configuration tool, not a runtime message broker
- Mobile app — web-first
- ML-powered auto-mapping suggestions — may revisit in future

## Context

- ISO20022 is a family of XML-based financial messaging standards. Implementations vary across institutions, so the same message type (e.g., pacs.008) may have different field usage patterns. Mappings need to account for implementation-specific variations.
- TransferMate API uses JSON key-value pairs for payment operations.
- The initial use case is ISO20022 ↔ TransferMate, but the architecture must support arbitrary format pairings (XML ↔ JSON, CSV ↔ SQL schema, custom ↔ custom).
- External clients will use this tool, so the UI must be intuitive and polished — not an internal dev tool.
- Transformation requirements include: date/number/currency format conversion, field splitting and concatenation, conditional mapping logic (if X then Y), and code lookup tables between systems.

## Constraints

- **Tech stack**: Next.js (full-stack), TypeScript, PostgreSQL (free cloud tier — Neon or Supabase)
- **Deployment**: Must work with free-tier infrastructure initially
- **Extensibility**: Format parsers must be pluggable — adding a new format should not require changes to the mapping engine or UI

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js full-stack | Single codebase, shared TypeScript types ideal for a data-structure mapping tool | — Pending |
| Side-by-side panel UI (not node canvas) | More intuitive for field-to-field mapping; clients need clear visual | — Pending |
| PostgreSQL free cloud tier | Cost-effective, works well with Next.js, scales when needed | — Pending |
| Library + custom upload for formats | Pre-loaded common types for quick start, custom upload for flexibility | — Pending |
| Multi-tenant with client workspaces | External clients need isolation and organization | — Pending |

---
*Last updated: 2026-02-11 after initialization*
