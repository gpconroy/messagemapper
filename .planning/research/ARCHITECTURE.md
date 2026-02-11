# Architecture Research: MessageMapper

## System Overview

MessageMapper is a multi-tenant web application with four major subsystems: Format Parsing, Mapping Engine, Visual UI, and Multi-Tenant Platform.

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Visual UI    │  │ Mapping      │  │ Platform Layer    │  │
│  │  (React Flow) │←→│ Engine       │  │ (Auth, Tenants,   │  │
│  │              │  │ (Transforms) │  │  Workspaces)      │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────────┘  │
│         │                 │                   │              │
│  ┌──────┴─────────────────┴───────────────────┴───────────┐  │
│  │              Format Parser Registry                     │  │
│  │  ┌─────┐  ┌──────┐  ┌─────┐  ┌──────┐  ┌──────────┐   │  │
│  │  │ XML │  │ JSON │  │ CSV │  │ XSD  │  │ SQL DDL  │   │  │
│  │  └─────┘  └──────┘  └─────┘  └──────┘  └──────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────┴───────────────────────────────┐  │
│  │                   PostgreSQL Database                    │  │
│  │  Tenants | Users | Schemas | Mappings | Transforms      │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Major Components

### 1. Format Parser Registry (Pluggable)

**Responsibility:** Parse any supported format into a normalized field tree (the internal representation).

**Key concept — Normalized Field Tree:**
Every format (XML, JSON, CSV, SQL) gets parsed into the same internal structure:

```typescript
interface FieldNode {
  id: string;              // Unique path-based ID
  name: string;            // Field name
  path: string;            // Full path (e.g., "Document.CstmrCdtTrfInitn.GrpHdr.MsgId")
  type: string;            // Data type (string, number, date, etc.)
  required: boolean;       // Whether field is mandatory
  children?: FieldNode[];  // Nested fields (for XML elements, JSON objects)
  attributes?: FieldNode[];// XML attributes
  metadata: Record<string, any>; // Format-specific info (XML namespace, SQL constraints, etc.)
}
```

**Plugin interface:**
```typescript
interface FormatParser {
  id: string;                    // e.g., "xml", "json", "csv"
  name: string;                  // Display name
  fileExtensions: string[];      // Supported extensions
  parseSchema(input: string | File): Promise<FieldNode[]>;  // Parse schema/sample into field tree
  validateSample?(sample: string, schema: FieldNode[]): ValidationResult;  // Optional validation
}
```

**Why pluggable:** New formats (EDIFACT, HL7, Protobuf) can be added by implementing the FormatParser interface. No changes to mapping engine or UI.

**Build order dependency:** Must be built first — everything else depends on the field tree structure.

### 2. Mapping Engine

**Responsibility:** Define, store, validate, and execute field-to-field mappings with transformations.

**Core data model:**
```typescript
interface MappingConfig {
  id: string;
  name: string;
  sourceSchemaId: string;      // Reference to stored schema
  targetSchemaId: string;
  mappings: FieldMapping[];
  metadata: {
    createdBy: string;
    tenantId: string;
    version: number;
  };
}

interface FieldMapping {
  id: string;
  sourceFields: string[];       // One or more source field paths
  targetFields: string[];       // One or more target field paths
  transform?: TransformChain;   // Optional transformation pipeline
}

interface TransformChain {
  steps: TransformStep[];       // Ordered list of transformations
}

interface TransformStep {
  type: "format" | "split" | "concat" | "conditional" | "lookup" | "custom";
  config: Record<string, any>;  // Type-specific configuration
}
```

**Transformation types:**
- **Format:** Date format conversion, number formatting, currency codes
- **Split:** One source field → multiple target fields (regex or delimiter-based)
- **Concat:** Multiple source fields → one target field (with template/separator)
- **Conditional:** If/else mapping based on field values
- **Lookup:** Code translation tables (e.g., ISO country → internal ID)

**Build order dependency:** Depends on Format Parser (needs FieldNode type). Must be built before UI (UI renders mappings).

### 3. Visual Mapping UI

**Responsibility:** Side-by-side panel interface for creating and editing mappings.

**Layout:**
```
┌─────────────────────┬──────────┬─────────────────────┐
│   Source Schema      │ Mapping  │   Target Schema     │
│                      │  Lines   │                     │
│ ▼ Document           │    ╲     │ ▼ payment           │
│   ▼ CstmrCdtTrf     │     ╲    │   ▼ sender          │
│     ▼ GrpHdr         │      ╲   │     • name ─────────┤
│       • MsgId ───────┼───────╲──│     • address       │
│       • CreDtTm      │       ╲  │     • country       │
│       • NbOfTxs      │        ╲ │   ▼ beneficiary     │
│     ▼ PmtInf         │         ╲│     • name          │
│       • PmtMtd       │          │     • iban          │
│       ...            │          │     ...             │
└─────────────────────┴──────────┴─────────────────────┘
│          Transform Config Panel (expandable)          │
└──────────────────────────────────────────────────────┘
```

**React Flow usage:**
- Source and target fields are custom nodes in two columns
- Mappings are edges (connections) between nodes
- Edge click opens transformation config panel
- Unmapped fields highlighted with visual indicator (color/icon)
- Drag from source handle to target handle to create mapping

**State management:**
- Zustand store for mapping state (field trees, connections, transforms)
- Undo/redo stack for mapping changes
- Auto-save with debounce

**Build order dependency:** Depends on Format Parser and Mapping Engine.

### 4. Platform Layer (Multi-Tenant)

**Responsibility:** Authentication, tenancy, workspaces, RBAC, schema library.

**Tenant model:**
```
Organization (tenant)
  └── Workspace (message-type grouping)
       └── Mapping Config (saved mapping)
            ├── Source Schema (reference)
            ├── Target Schema (reference)
            └── Field Mappings + Transforms
```

**Roles:**
- **Admin:** Manage organization, invite users, manage all workspaces
- **Editor:** Create/edit mappings within assigned workspaces
- **Viewer:** Read-only access to mappings and reports

**Schema library:**
- Pre-loaded schemas (ISO20022 message types, common API formats)
- Custom schemas uploaded by clients
- Schemas can be shared across workspaces within a tenant
- Global library (read-only) vs. tenant-specific schemas

**Build order dependency:** Auth is foundational but can be built in parallel with parser/engine using middleware stubs.

## Data Flow

### Creating a Mapping
1. User selects source format → Parser extracts FieldNode tree
2. User selects target format → Parser extracts FieldNode tree
3. UI renders both trees side-by-side
4. User draws connections (edges) between fields
5. User configures transforms on connections
6. Mapping saved to database
7. Gap analysis computed (unmapped required fields flagged)

### Loading a Mapping
1. Fetch MappingConfig from database
2. Load source and target schemas
3. Parse into FieldNode trees
4. Render trees with existing connections overlaid
5. Highlight any schema changes since last save (drift detection)

### Exporting Gap Report
1. Compute unmapped fields on both source and target sides
2. Classify: unmapped required (critical) vs. unmapped optional (info)
3. Generate report (PDF/CSV) with field paths, types, and recommendations

## Database Schema (Key Tables)

```
organizations     — Tenant/company
users             — User accounts (linked to organizations)
roles             — RBAC definitions
schemas           — Stored format schemas (XML, JSON, CSV, SQL)
schema_library    — Pre-loaded global schemas
mapping_configs   — Saved mapping configurations
field_mappings    — Individual field-to-field connections
transforms        — Transformation definitions per mapping
lookup_tables     — Code translation tables
```

## Suggested Build Order

| Order | Component | Rationale |
|-------|-----------|-----------|
| 1 | Project scaffolding + DB schema | Foundation everything builds on |
| 2 | Format Parser Registry + XML/JSON parsers | Core abstraction, needed by everything |
| 3 | Mapping Engine (data model + CRUD) | Mapping logic independent of UI |
| 4 | Visual Mapping UI (React Flow) | Depends on parser + engine |
| 5 | Transformation system | Enhances mappings, complex feature |
| 6 | Auth + Multi-tenancy | Can be stubbed early, full implementation here |
| 7 | Schema Library | Pre-loaded + custom upload |
| 8 | Gap analysis + reporting | Builds on completed mapping system |
| 9 | CSV + SQL format parsers | Extend parser registry |
| 10 | Polish, testing, deployment | Production readiness |

## Key Architecture Principles

1. **Normalized field tree is the core abstraction** — Everything speaks FieldNode. Parsers produce them, the engine maps them, the UI renders them.
2. **Parsers are plugins** — Adding a format means implementing one interface. No core changes.
3. **Transforms are a pipeline** — Chain of steps, each with typed config. Easy to add new transform types.
4. **Tenant isolation at the data layer** — Every query filters by organizationId. No cross-tenant data leakage.
5. **Schema versioning** — Schemas can change. Mappings reference specific schema versions. Drift detection warns when schemas update.

---
*Researched: 2026-02-11*
*Confidence: HIGH for overall architecture, MEDIUM for XSD parsing complexity*
