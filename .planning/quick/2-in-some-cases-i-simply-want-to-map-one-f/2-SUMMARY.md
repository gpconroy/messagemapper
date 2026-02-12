---
phase: quick-2
plan: 01
subsystem: transformation-system
tags: [transformation, ui, backend, testing]
dependency-graph:
  requires: [transformation-types, transformation-registry, transformation-validator, transformation-ui]
  provides: [direct-mapping-type]
  affects: [mapping-editor, transformation-pipeline]
tech-stack:
  added: []
  patterns: [passthrough-transform, zero-config-ui]
key-files:
  created:
    - src/transformations/builtins/direct.ts
  modified:
    - src/transformations/types.ts
    - src/transformations/registry.ts
    - src/transformations/validator.ts
    - src/transformations/index.ts
    - src/app/api/transformations/route.ts
    - src/app/mapper/components/TransformationDialog.tsx
    - src/app/mapper/components/TransformationBadge.tsx
    - src/transformations/__tests__/builtins.test.ts
    - src/transformations/__tests__/pipeline.test.ts
decisions:
  - title: "Direct mapping as first/default transformation type"
    rationale: "Most field mappings are simple 1:1 copies, so making direct mapping the default reduces cognitive load and click-through for the most common use case"
  - title: "Arrow abbreviation (->) for direct mapping badge"
    rationale: "Visually represents direct passthrough and is universally understood as a simple mapping symbol"
  - title: "Empty DirectConfig interface"
    rationale: "Direct mapping requires no configuration - value passes through unchanged. Empty interface maintains type consistency across all transformation types"
metrics:
  duration: 265s
  completed: 2026-02-12T15:10:53Z
  tasks-completed: 2
  files-modified: 10
  commits: 2
---

# Quick Task 2: Direct Mapping Transformation

**One-liner:** Added "direct" passthrough transformation type allowing 1:1 field mapping without configuration, positioned as default option in UI

## Overview

Implemented a full-stack `direct` transformation type that copies source field values to target fields unchanged. This addresses the common use case where users simply want to map one field to another without any transformation (e.g., `source.orderId -> target.orderReference`).

Previously, users had no obvious way to create simple 1:1 mappings and had to work around the system or misuse types like "constant". The direct mapping type is now the first and default option in the transformation dialog, making the simplest case the easiest to select.

## Tasks Completed

### Task 1: Add direct transformation type across backend stack
**Commit:** `1b4c107`

- Added `'direct'` as first entry in `TransformationType` union
- Created `DirectConfig` interface (empty - no configuration needed)
- Implemented `directMap` builtin function as pure passthrough: `return input;`
- Registered `directMap` in `transformRegistry` (first position)
- Added `'direct'` to validator enum and created `DirectConfigSchema`
- Added `direct` to `configSchemaMap` with empty object schema
- Exported `DirectConfig` and `DirectConfigSchema` from index
- Added `'direct'` to API route `TRANSFORMATION_TYPES` array (first position)

**Verification:** TypeScript compilation passed, all existing transformation tests passed.

**Files modified:**
- `src/transformations/types.ts` - Added DirectConfig interface and 'direct' to type union
- `src/transformations/builtins/direct.ts` - Created directMap function
- `src/transformations/registry.ts` - Registered directMap as first transform
- `src/transformations/validator.ts` - Added DirectConfigSchema and enum entry
- `src/transformations/index.ts` - Exported DirectConfig and schema
- `src/app/api/transformations/route.ts` - Added 'direct' to valid types array

### Task 2: Add direct mapping to UI and write tests
**Commit:** `49baa1e`

- Added `{ value: 'direct', label: 'Direct Mapping' }` as first entry in dialog dropdown
- Changed default `selectedType` from `'format_date'` to `'direct'`
- Added case for `'direct'` in `renderConfigForm()` showing message: "No configuration needed. The source field value will be copied directly to the target field."
- Added `'->'` abbreviation in `TransformationBadge` (represents passthrough visually)
- Added `directMap` test suite in `builtins.test.ts`:
  - Passes through string values unchanged
  - Passes through number values unchanged
  - Passes through null unchanged
  - Passes through objects unchanged
  - Is callable via executeTransform
- Added pipeline test for direct mapping execution (Alice -> displayName)
- Updated validator test from "all 8 transformation types" to "all 9 transformation types"

**Verification:** All 72 tests passed including new direct mapping tests. TypeScript compilation passed.

**Files modified:**
- `src/app/mapper/components/TransformationDialog.tsx` - Added direct option, set as default
- `src/app/mapper/components/TransformationBadge.tsx` - Added '->' abbreviation
- `src/transformations/__tests__/builtins.test.ts` - Added 5 directMap tests
- `src/transformations/__tests__/pipeline.test.ts` - Added pipeline and validator tests

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**Type safety:**
- `npx tsc --noEmit` - PASSED (no errors)

**Test coverage:**
- `npx jest --testPathPatterns="transformations" --verbose` - PASSED
- 72 tests passed (66 existing + 6 new)
- Test suites: 3 passed (builtins, pipeline, sandbox)

**Full-stack integration:**
- Backend: Direct type recognized in types, registry, validator, API route
- UI: Direct mapping appears as first option in dropdown, shows as default selection
- Badge: Shows '->' abbreviation on edges with direct mapping
- Tests: Full coverage for builtin function, pipeline execution, and validation

## Success Criteria Met

- [x] User can select "Direct Mapping" from the transformation type dropdown (it is the first/default option)
- [x] Direct mapping passes the source value through unchanged (string, number, null, object all work)
- [x] No configuration form is shown - just a message saying no config is needed
- [x] Badge shows "->" on edges with direct mapping
- [x] All existing tests continue to pass
- [x] New tests cover direct mapping in builtins, pipeline, and validation

## Technical Notes

**Implementation pattern:** The `directMap` function follows the same signature as all other transformation functions (`(input: unknown, config: DirectConfig) => unknown`) but simply returns the input unchanged. This maintains consistency with the transformation registry while requiring zero processing.

**Zero-configuration design:** The `DirectConfig` interface is intentionally empty (`{}`), and the UI shows a descriptive message instead of a form. This reduces friction for the most common mapping scenario.

**Positioning strategy:** Direct mapping is placed first in all arrays (type union, dropdown, registry, validator enum) to signal it as the primary/default option and ensure it appears at the top of selection lists.

**Test coverage:** Tests verify passthrough behavior for primitive types (string, number, null) and reference types (objects), plus integration with the pipeline and validator systems.

## Self-Check: PASSED

**Created files exist:**
- FOUND: src/transformations/builtins/direct.ts

**Commits exist:**
- FOUND: 1b4c107 (feat(quick-2): add direct mapping transformation type)
- FOUND: 49baa1e (feat(quick-2): add direct mapping to UI and tests)

**Modified files have expected content:**
- VERIFIED: 'direct' is first entry in TransformationType union
- VERIFIED: DirectConfig interface exists in types.ts
- VERIFIED: directMap registered first in transformRegistry
- VERIFIED: 'direct' is first in validator enum
- VERIFIED: Direct Mapping is first option in TransformationDialog
- VERIFIED: '->' abbreviation added to TransformationBadge
- VERIFIED: directMap test suite exists with 5 tests
- VERIFIED: Pipeline test for direct mapping exists
- VERIFIED: Validator test updated to check 9 types

All verification checks passed.
