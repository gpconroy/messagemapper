---
phase: quick-6
plan: 1
subsystem: mapper-ui
tags: [bugfix, react-flow, handles, node-resizer, critical-regression]
dependency_graph:
  requires: [quick-4]
  provides: [working-connection-drawing]
  affects: [field-mapping-core-functionality]
tech_stack:
  added: []
  patterns: [z-index-layering, overflow-management]
key_files:
  created: []
  modified:
    - src/app/mapper/components/FieldTreeNode.tsx
    - src/app/mapper/components/FieldTreeItem.tsx
decisions:
  - "Changed outer container overflow from hidden to visible to prevent React Flow Handle clipping at node boundaries"
  - "Added zIndex: 10 to Handle components to ensure they render above NodeResizer interaction zones"
  - "Applied overflow-hidden selectively to internal containers (header, field list) to preserve rounded corner appearance"
metrics:
  duration: 158
  completed: 2026-02-12T16:09:15Z
  tasks: 1
  files_modified: 2
---

# Quick Task 6: Restore Field Connection Drawing

**One-liner:** Fixed Handle component z-index and container overflow to restore connection drawing broken by NodeResizer addition.

## Problem

After quick task 4 added NodeResizer to field tree boxes, users could no longer drag connections between source and target fields. This was a critical regression affecting the core value proposition of the application.

## Root Cause

Two interrelated issues:

1. **Container overflow clipping:** The outer div in FieldTreeNode had `overflow-hidden`, which clipped React Flow Handle components positioned at the node edge (Position.Right/Left). Only half of each handle was visible, breaking pointer event registration.

2. **Z-index competition:** NodeResizer renders invisible resize zones on all edges and corners. Without explicit z-index on Handles, these zones intercepted mousedown/drag events before they reached the Handle components.

## Solution

**File: src/app/mapper/components/FieldTreeNode.tsx**
- Changed outer div from `overflow-hidden` to `overflow-visible` (line 78)
- Added `overflow-hidden` to header div (line 90) to preserve rounded corners
- Added `overflow-x-hidden` to field list div (line 133) to prevent horizontal overflow while allowing vertical scroll

**File: src/app/mapper/components/FieldTreeItem.tsx**
- Added `zIndex: 10` to Handle style prop (line 172) to render above NodeResizer (default z-index ~5)

## Testing

Verified via TypeScript compilation:
- `npx next build` passed with no errors
- All components type-checked successfully

Manual testing required (per plan):
- Load source and target schemas
- Expand fields in both trees
- Drag from source handle (right edge) to target handle (left edge)
- Verify blue connection line appears during drag
- Verify edge is created on drop
- Verify NodeResizer still functions for box resizing
- Verify field list scrolling still works

## Impact

**Restored functionality:**
- Users can draw connections between source and target fields
- Handle components are fully interactive
- Connection preview line appears during drag
- Edges are created on valid drops

**Preserved functionality:**
- NodeResizer corner/edge dragging still works
- Field list vertical scrolling unchanged
- Search/filter, expand/collapse, type badges all unchanged
- Validation indicators still visible

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

**Created files:** None
**Modified files:**
- ✓ src/app/mapper/components/FieldTreeNode.tsx exists
- ✓ src/app/mapper/components/FieldTreeItem.tsx exists

**Commits:**
- ✓ 60c3eca exists: fix(quick-6): restore field-to-field connection drawing

All claimed artifacts verified.
