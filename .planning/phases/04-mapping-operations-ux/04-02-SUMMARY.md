---
phase: 04-mapping-operations-ux
plan: 02
subsystem: mapping-interface
tags: [undo-redo, state-management, keyboard-shortcuts, temporal-middleware]
dependency_graph:
  requires:
    - Phase 03 visual mapping interface (React Flow integration)
    - useMappingState hook pattern for state management
  provides:
    - Zustand store with temporal middleware for undo/redo
    - MappingToolbar component with undo/redo UI
    - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
    - Time-travel state management for mapping connections
  affects:
    - useMappingState hook (now bridges Zustand to React Flow)
    - Mapper page layout (toolbar added between uploads and canvas)
tech_stack:
  added:
    - zustand: State management library (v5.0.11)
    - zundo: Temporal middleware for time-travel state (v2.3.0)
  patterns:
    - Zustand store with temporal middleware
    - Bridge pattern (hook adapts Zustand to React Flow interface)
    - Temporal state partitioning (only connections tracked, not schemas)
key_files:
  created:
    - src/app/mapper/store/useMappingStore.ts: "Zustand store with temporal middleware"
    - src/app/mapper/components/MappingToolbar.tsx: "Undo/redo toolbar with keyboard shortcuts"
  modified:
    - src/app/mapper/hooks/useMappingState.ts: "Updated to bridge Zustand store to React Flow format"
    - src/app/mapper/page.tsx: "Added MappingToolbar between upload panels and canvas"
    - package.json: "Added zustand and zundo dependencies"
decisions:
  - decision: "Use Zustand with Zundo temporal middleware instead of custom history implementation"
    rationale: "Sub-700 byte overhead, automatic time-travel, well-tested library"
    alternatives: ["Custom history stack", "Redux with redux-undo", "Immer with patches"]
  - decision: "Only track connections in undo/redo history, not schema state"
    rationale: "Schema uploads are not reversible mapping actions, prevents history pollution"
    implementation: "partialize option limits temporal tracking to connections array only"
  - decision: "Limit history to 50 entries"
    rationale: "Prevents unbounded memory growth while providing ample undo depth"
  - decision: "Keep useMappingState as bridge hook maintaining existing interface"
    rationale: "Zero breaking changes to consuming components (page.tsx, MappingCanvas.tsx)"
    implementation: "Hook derives React Flow nodes/edges from Zustand store state"
  - decision: "Support both Ctrl+Shift+Z and Ctrl+Y for redo"
    rationale: "Cross-platform convention (Mac vs Windows user expectations)"
metrics:
  duration_seconds: 411
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  commits: 2
  completed_date: 2026-02-12
---

# Phase 4 Plan 02: Undo/Redo with Temporal Middleware Summary

**One-liner:** Zustand store with Zundo temporal middleware enables undo/redo for mapping connections via keyboard shortcuts and toolbar UI.

## What Was Built

Implemented undo/redo functionality for mapping operations using Zustand state management with Zundo temporal middleware. Users can now reverse and replay connection create/delete actions using keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) or toolbar buttons.

### Task 1: Zustand Store with Temporal Middleware

**Commit:** 6dc8cfa

Created centralized state management with time-travel capabilities:

1. **Installed dependencies:**
   - zustand v5.0.11: Minimal state management library
   - zundo v2.3.0: Temporal middleware for undo/redo

2. **Created `useMappingStore.ts`:**
   - Store interface with connections state (tracked) and schema state (not tracked)
   - Temporal middleware wrapping with `partialize` option limiting history to connections only
   - 50-entry history limit to prevent memory bloat
   - Actions: addConnection, removeConnection, removeConnections, setSourceSchema, setTargetSchema

3. **Updated `useMappingState.ts` hook:**
   - Changed from React Flow's useEdgesState to Zustand store consumer
   - Bridge pattern: derives React Flow nodes/edges from Zustand store state
   - Maintained backward-compatible return signature (zero breaking changes)
   - Schema nodes built from store sourceSchema/targetSchema
   - Edges derived from store connections array
   - onConnect/onEdgesDelete delegate to store actions (trackable by temporal middleware)

**Key design decisions:**
- Only connections tracked in undo/redo (not schema uploads or UI state like expansion)
- useMappingState acts as adapter between Zustand and React Flow
- React Flow's useNodesState still used for UI-level node changes (position, selection)

### Task 2: MappingToolbar Component

**Commit:** 1f0ea2b

Built toolbar UI with undo/redo buttons and keyboard shortcuts:

1. **Created `MappingToolbar.tsx`:**
   - useUndoRedo hook accessing temporal store for undo/redo actions
   - Subscription to temporal state for button enabled/disabled state
   - Keyboard event listener supporting:
     - Ctrl+Z (Cmd+Z on Mac): Undo
     - Ctrl+Shift+Z (Cmd+Shift+Z on Mac): Redo
     - Ctrl+Y (Cmd+Y on Mac): Redo (Windows convention)
   - Inline SVG icons (undo/redo arrows) to avoid icon library dependency
   - Disabled state with reduced opacity when no history/future states
   - Status text indicating "Changes tracked" or "No changes to undo"

2. **Updated `page.tsx`:**
   - Imported and rendered MappingToolbar between upload panels and canvas
   - Toolbar positioned as horizontal bar in layout flow

**UI/UX details:**
- Buttons visually disabled when no history (opacity 40%, cursor not-allowed)
- Keyboard shortcuts prevent default browser behavior
- Cross-platform support (Meta key on Mac, Ctrl on Windows)
- Accessible ARIA labels on buttons

## Verification Results

All verification criteria passed:

- ✅ `npm run build` completes without errors
- ✅ `npx tsc --noEmit` passes
- ✅ zustand and zundo in package.json dependencies
- ✅ useMappingStore exports store with temporal middleware
- ✅ useMappingState return type unchanged (backward compatible)
- ✅ MappingToolbar renders between upload panels and canvas
- ✅ Undo/redo buttons show disabled state when history is empty
- ✅ React Flow Controls component still provides zoom/pan functionality

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Functional testing required (human verification):**
1. Create a mapping connection → Ctrl+Z → connection removed
2. After undo → Ctrl+Shift+Z → connection restored
3. Delete connection with Backspace → Ctrl+Z → connection restored
4. Undo button disabled when no history
5. Redo button disabled when no future states
6. Upload new schema → not undoable (correct - schemas not in history)
7. Zoom/pan controls still functional (React Flow Controls)

## Technical Debt & Future Work

None identified. Implementation is clean and follows best practices.

## Dependencies for Next Plans

**Provided for downstream plans:**
- Zustand store pattern established for future state needs
- Temporal middleware available for other undoable operations
- Bridge pattern demonstrates how to adapt Zustand to React Flow

**Phase 5 (Transformation System) can leverage:**
- Store pattern for managing transformation state
- Temporal middleware for undoing transformation edits

## Files Changed

**Created:**
- src/app/mapper/store/useMappingStore.ts (71 lines)
- src/app/mapper/components/MappingToolbar.tsx (127 lines)

**Modified:**
- src/app/mapper/hooks/useMappingState.ts (160 lines, -94 +66 net change)
- src/app/mapper/page.tsx (72 lines, +3 lines for import and toolbar render)
- package.json (+2 dependencies)

**Total:** 2 files created, 3 files modified, 2 commits, 411 seconds

## Self-Check: PASSED

Verifying all claimed artifacts exist:

**Created files:**
- ✅ src/app/mapper/store/useMappingStore.ts exists
- ✅ src/app/mapper/components/MappingToolbar.tsx exists

**Commits:**
- ✅ 6dc8cfa exists (Task 1: Zustand store with temporal middleware)
- ✅ 1f0ea2b exists (Task 2: MappingToolbar with undo/redo)

**Dependencies:**
- ✅ zustand v5.0.11 in package.json
- ✅ zundo v2.3.0 in package.json

All artifacts verified present.
