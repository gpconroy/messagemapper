# Requirements: MessageMapper

**Defined:** 2026-02-11
**Core Value:** Clients can visually map fields between any two message formats and save those mappings for reuse

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Schema & Parsing

- [ ] **PARS-01**: User can upload an XSD schema file and see its field structure parsed into a navigable tree
- [ ] **PARS-02**: User can upload a sample XML message and have its structure inferred automatically
- [ ] **PARS-03**: User can upload a JSON schema or sample JSON and see its field structure parsed
- [ ] **PARS-04**: User can upload a CSV file and have columns extracted as fields
- [ ] **PARS-05**: User can upload a SQL DDL file and have table/column structure extracted as fields
- [ ] **PARS-06**: User can select source and target formats from a pre-loaded library (ISO20022 types, TransferMate API)
- [ ] **PARS-07**: User can upload custom schema/sample files to add to their workspace library
- [ ] **PARS-08**: User sees validation errors when uploading a malformed schema or sample

### Visual Mapping

- [ ] **MAP-01**: User sees source fields on the left panel and target fields on the right panel
- [ ] **MAP-02**: User can draw a connector from a source field to a target field to create a 1:1 mapping
- [ ] **MAP-03**: User can expand/collapse nested field structures (XML elements, JSON objects)
- [ ] **MAP-04**: User can search and filter fields by name in both source and target panels
- [ ] **MAP-05**: User can see which fields are required vs optional (visual indicators)
- [ ] **MAP-06**: User can see field data types (string, number, date, boolean) displayed on each field
- [ ] **MAP-07**: User can undo and redo mapping actions
- [ ] **MAP-08**: User can zoom and pan the mapping canvas for large schemas
- [ ] **MAP-09**: User sees auto-suggested field matches based on name and type similarity
- [ ] **MAP-10**: User can see mapping status on each field (mapped, unmapped, partially mapped)
- [ ] **MAP-11**: User can delete individual mapping connections

### Transformations

- [ ] **XFRM-01**: User can apply format conversion on a mapping (date formats, number formats, currency codes)
- [ ] **XFRM-02**: User can concatenate multiple source fields into one target field with configurable separator
- [ ] **XFRM-03**: User can split one source field into multiple target fields using delimiter or regex
- [ ] **XFRM-04**: User can set a constant value for a target field (not sourced from input)
- [ ] **XFRM-05**: User can define conditional mapping rules (if source field equals X, map to Y; otherwise map to Z)
- [ ] **XFRM-06**: User can create and manage lookup tables for code translation between systems
- [ ] **XFRM-07**: User can write custom JavaScript transformation functions for edge cases

### Validation & Testing

- [ ] **VAL-01**: User sees validation errors for type mismatches and missing required field mappings
- [ ] **VAL-02**: User can test a mapping with sample data and see the transformed output

### Platform

- [ ] **PLAT-01**: User can create an account with email and password
- [ ] **PLAT-02**: User can log in and maintain a session across browser refreshes
- [ ] **PLAT-03**: User can log out from any page
- [ ] **PLAT-04**: Admin can assign roles (admin, editor, viewer) to users in their organization
- [ ] **PLAT-05**: Each organization has isolated workspaces that other organizations cannot access
- [ ] **PLAT-06**: User can create, rename, and organize mapping configurations within workspaces
- [ ] **PLAT-07**: User can save mapping configurations and load them later
- [ ] **PLAT-08**: Editor role can create/edit mappings; viewer role has read-only access

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Quality & Reporting

- **GAP-01**: User sees visual heat map of unmapped fields across entire mapping
- **GAP-02**: User can export a gap report (PDF/CSV) listing all unmapped fields with field paths and types
- **HIST-01**: User can view version history of a mapping configuration
- **HIST-02**: User can rollback a mapping to a previous version
- **TEST-01**: User can save test cases with sample input and expected output for regression testing

### Collaboration

- **COLLAB-01**: Multiple users can edit the same mapping simultaneously (real-time collaboration)
- **OAUTH-01**: User can log in via Google or GitHub OAuth

### Advanced

- **TMPL-01**: User can save a mapping pattern as a reusable template
- **TMPL-02**: User can apply a template to new schema pairs with parameter mapping
- **BULK-01**: User can select multiple fields and apply the same transformation to all
- **EXPORT-01**: User can export mapping as executable transformation code (XSLT, JavaScript)
- **DOC-01**: User can export mapping documentation as PDF/HTML for auditors

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time message processing/broker | This is a mapping configuration tool, not a runtime engine |
| Data connectors (database, API, FTP) | Accept file uploads only — don't become an iPaaS |
| Workflow orchestration | Mapping is one step; external tools handle process flow |
| Data quality/cleansing | Basic validation only — advanced cleansing is pre-processing |
| Scheduling/job execution | Provide API; users schedule via their own tools |
| Mobile app | Web-first platform |
| ML-powered auto-mapping | Heuristic-based suggestions in v1; ML deferred |
| On-premise deployment | SaaS only for v1 |
| Dark mode | Polish feature, not core functionality |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARS-01 | Phase 2: Format Parser Registry | Pending |
| PARS-02 | Phase 2: Format Parser Registry | Pending |
| PARS-03 | Phase 2: Format Parser Registry | Pending |
| PARS-04 | Phase 7: Schema Library Management | Pending |
| PARS-05 | Phase 7: Schema Library Management | Pending |
| PARS-06 | Phase 7: Schema Library Management | Pending |
| PARS-07 | Phase 7: Schema Library Management | Pending |
| PARS-08 | Phase 2: Format Parser Registry | Pending |
| MAP-01 | Phase 3: Visual Mapping Interface | Pending |
| MAP-02 | Phase 3: Visual Mapping Interface | Pending |
| MAP-03 | Phase 3: Visual Mapping Interface | Pending |
| MAP-04 | Phase 4: Mapping Operations & UX | Pending |
| MAP-05 | Phase 4: Mapping Operations & UX | Pending |
| MAP-06 | Phase 4: Mapping Operations & UX | Pending |
| MAP-07 | Phase 4: Mapping Operations & UX | Pending |
| MAP-08 | Phase 4: Mapping Operations & UX | Pending |
| MAP-09 | Phase 8: Intelligence & Quality | Pending |
| MAP-10 | Phase 3: Visual Mapping Interface | Pending |
| MAP-11 | Phase 3: Visual Mapping Interface | Pending |
| XFRM-01 | Phase 5: Transformation System | Pending |
| XFRM-02 | Phase 5: Transformation System | Pending |
| XFRM-03 | Phase 5: Transformation System | Pending |
| XFRM-04 | Phase 5: Transformation System | Pending |
| XFRM-05 | Phase 5: Transformation System | Pending |
| XFRM-06 | Phase 5: Transformation System | Pending |
| XFRM-07 | Phase 5: Transformation System | Pending |
| VAL-01 | Phase 6: Validation & Testing | Pending |
| VAL-02 | Phase 6: Validation & Testing | Pending |
| PLAT-01 | Phase 9: Platform Features | Pending |
| PLAT-02 | Phase 9: Platform Features | Pending |
| PLAT-03 | Phase 9: Platform Features | Pending |
| PLAT-04 | Phase 9: Platform Features | Pending |
| PLAT-05 | Phase 9: Platform Features | Pending |
| PLAT-06 | Phase 9: Platform Features | Pending |
| PLAT-07 | Phase 9: Platform Features | Pending |
| PLAT-08 | Phase 9: Platform Features | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

**Note:** PARS-04 and PARS-05 appear in both Phase 7 (initial capability) and Phase 10 (advanced format parser implementation). Phase 7 covers basic CSV/SQL parsing as part of schema library management, while Phase 10 extends the parser registry with full CSV and SQL DDL format parsers that integrate with all transformation and validation features.

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
