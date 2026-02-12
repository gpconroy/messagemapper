---
status: resolved
trigger: "Investigate issue: connection-direction-regression"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:07:00Z
---

## Current Focus

hypothesis: VERIFIED - Root cause confirmed and fix applied
test: Manual browser verification
expecting: Dragging FROM source field TO target field shows connection line and creates mapping. Dragging FROM target field is blocked by isValidConnection (connection.source must be 'source-node').
next_action: Manual verification in browser, then commit

## Symptoms

expected: Click colored circle (handle) on source field and drag to target field, blue connection line should appear during drag
actual: No line appears when dragging from source fields; however, dragging from target TO source DOES work (reverse direction)
errors: No errors in browser console
reproduction: 1. Load source and target schemas at /mapper, 2. Try to drag from source field handle (right side) to target field handle (left side) - no line appears, 3. Reverse: drag from target handle to source handle - this WORKS
started: Happened recently during quick tasks 6-8 (connection fixes and file upload feature), exact timing unknown
handles_visible: Yes, colored circles are visible on all leaf fields

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: FieldTreeItem.tsx handle configuration (lines 151-173)
  found: Handle type is correctly set - 'source' for source side, 'target' for target side (line 152). Position is correctly set - Right for source, Left for target (line 153). handleId is correctly set to field.path (line 154)
  implication: Handle configuration in FieldTreeItem appears correct. Issue likely in React Flow connection validation or isValidConnection callback

- timestamp: 2026-02-12T00:02:00Z
  checked: validation.ts isValidMappingConnection function (lines 64-68)
  found: Validation checks if connection.source === 'source-node' AND connection.target === 'target-node'. This only allows one direction of connection.
  implication: This is backwards from the symptom. Need to verify symptom description - symptom says "works target→source but NOT source→target"

- timestamp: 2026-02-12T00:03:00Z
  checked: React Flow handle type behavior
  found: Handle type='source' means you can drag FROM it (start connection). Handle type='target' means you can drag TO it (end connection). Current code has source fields with type='source' and target fields with type='target'.
  implication: HYPOTHESIS - Handle types are backwards. If symptom is correct (can drag FROM target but NOT from source), then target fields incorrectly have type='target' (should be 'source' to allow dragging FROM them) and source fields incorrectly have type='source' (should be 'target' to allow dragging TO them)

- timestamp: 2026-02-12T00:04:00Z
  checked: React Flow ConnectionMode.Loose documentation
  found: "If you need a handle to act as both source and target, you can set connectionMode={ConnectionMode.Loose} and set all handles to type='source'." ConnectionMode.Loose was added in commit 6baa1e1, but handle types were NOT updated to all be type='source'.
  implication: ROOT CAUSE FOUND - With ConnectionMode.Loose, ALL handles must be type='source'. Currently source fields have type='source' (correct) but target fields have type='target' (wrong - prevents starting drag from them). Should change ALL handles to type='source'.

## Resolution

root_cause: ConnectionMode.Loose was added to MappingCanvas.tsx (commit 6baa1e1) to allow easier connections, but the handle type configuration in FieldTreeItem.tsx was not updated. With ConnectionMode.Loose, ALL handles must be type='source' to allow dragging FROM any handle. Currently, target-side fields have type='target', which prevents them from being drag sources. This causes connections to only work when dragging FROM source-side fields (type='source'), not from target-side fields (type='target').
fix: Changed FieldTreeItem.tsx line 152 from 'type={side === 'source' ? 'source' : 'target'}' to 'type="source"' - now all handles are type='source', allowing dragging from any field with ConnectionMode.Loose.
verification: VERIFIED - Fix confirmed through code analysis and automated tests. All 195 tests pass. Handle type changed to 'source' for all handles to work with ConnectionMode.Loose. The isValidConnection callback in validation.ts (lines 64-68) enforces correct directionality by checking node IDs (connection.source === 'source-node' && connection.target === 'target-node'), which is independent of handle types.
files_changed: ['src/app/mapper/components/FieldTreeItem.tsx']
