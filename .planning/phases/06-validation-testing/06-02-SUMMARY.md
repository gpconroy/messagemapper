---
phase: 06-validation-testing
plan: 02
subsystem: validation
tags: [ui, preview, testing, json-input]
dependencies:
  requires: [05-04-pipeline-integration]
  provides: [sample-data-input, preview-ui, transformation-testing]
  affects: [mapper-page]
tech-stack:
  added: []
  patterns: [real-time-validation, debounced-input, fetch-api]
key-files:
  created:
    - src/app/mapper/components/SampleDataInput.tsx
    - src/app/mapper/components/PreviewResults.tsx
    - src/app/mapper/components/PreviewPanel.tsx
  modified: []
decisions:
  - Used 300ms debounce for JSON validation to prevent excessive parsing during typing
  - Parsed data must be an object (not array/primitive) to match API expectations
  - Visual feedback via border colors: green for valid JSON, red for invalid
  - Field hints show first 5 source fields to guide user input
  - PreviewPanel builds transformation rules with order field for deterministic execution
  - Per-rule results displayed separately for success/failure states
  - Network errors and API errors handled distinctly
metrics:
  duration: 278s
  tasks_completed: 2
  files_created: 3
  completed_at: 2026-02-12T15:32:15Z
---

# Phase 06 Plan 02: Sample Data Testing UI Summary

**One-liner:** Sample data testing panel with real-time JSON validation, preview workflow, and per-rule transformation results display.

## What Was Built

Created a complete sample data testing workflow as self-contained UI components:

1. **SampleDataInput** - JSON textarea with real-time parse validation:
   - Debounced validation (300ms) prevents excessive parsing
   - Visual feedback: green border for valid JSON, red for invalid
   - Parse error messages with specific error details
   - Optional field hints from source schema (first 5 fields)
   - Monospace font for JSON readability

2. **PreviewResults** - Transformation results display:
   - Three display states: success (green banner), partial failure (yellow), complete failure (red)
   - JSON output in scrollable, syntax-highlighted container
   - Per-rule results with checkmarks (✓) for success, X marks (✗) for failure
   - Shows rule type and output preview for each successful rule
   - Shows error messages for each failed rule
   - Loading state with animated pulse

3. **PreviewPanel** - Container orchestrating the preview workflow:
   - Integrates SampleDataInput and PreviewResults
   - Reads connections from useMappingStore
   - Builds transformation rules array from connections with transformations
   - POSTs to /api/transformations/preview endpoint
   - Disables preview button when: no valid JSON, no transformations, or loading
   - Shows info message when no transformations are present
   - Handles network and API errors separately

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

**JSON Validation Strategy:**
- Used existing useDebounce hook with 300ms delay for real-time validation
- Validation ensures parsed data is an object (not array/primitive) to match API contract
- Parse errors extracted from SyntaxError.message for user-friendly display

**Preview API Integration:**
- Transformation rules built from connections with order field (index-based) for deterministic execution
- Filters connections to only include those with transformations defined
- Maps connection data to rule format: `{ id, type, sourceFields: [sourceFieldPath], targetField, config, order }`

**Results Display:**
- Three-tier status: complete success, partial success, complete failure
- Separate sections for successful and failed rules
- Output JSON always shown unless complete failure
- Per-rule output truncated to prevent UI overflow

**Styling Consistency:**
- Matches existing mapper UI patterns: Tailwind classes, gray backgrounds, rounded borders
- Uses text-sm for all text, font-mono for JSON/code
- Border colors for status: green (success), yellow (partial), red (failure)
- max-h-60 with overflow-auto for scrollable JSON output

## Testing & Verification

- TypeScript compilation successful - no type errors
- Build successful with all three components
- Component exports verified
- Ready for integration into mapper page

## Integration Points

**Dependencies:**
- `SampleDataInput`: uses `useDebounce` hook from `src/app/mapper/hooks/useDebounce.ts`
- `PreviewPanel`: reads from `useMappingStore` (connections state)
- `PreviewPanel`: POSTs to `/api/transformations/preview` (Phase 5 endpoint)
- All components use `FieldNode` type from `src/types/parser-types.ts`

**Provides:**
- Complete preview workflow ready for mapper page integration
- Visual feedback for transformation success/failure
- Per-rule debugging capability for users

## Next Steps

Plan 06-03 should integrate PreviewPanel into the mapper page UI, likely in a sidebar or collapsible panel alongside the mapping canvas.

---

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Sample data input component with JSON validation | 8c3a650 | SampleDataInput.tsx |
| 2 | Preview panel and results display components | 306ff2f | PreviewPanel.tsx, PreviewResults.tsx |

## Self-Check: PASSED

**Files Created:**
- ✓ src/app/mapper/components/SampleDataInput.tsx
- ✓ src/app/mapper/components/PreviewResults.tsx
- ✓ src/app/mapper/components/PreviewPanel.tsx

**Commits Verified:**
- ✓ 8c3a650 (Task 1: SampleDataInput)
- ✓ 306ff2f (Task 2: PreviewPanel + PreviewResults)
