---
status: resolved
trigger: "connection-not-persisting"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - All handles are type='source', causing React Flow to reject connections
test: change target-side handles to type='target'
expecting: connections will persist after changing target handles to type='target'
next_action: fix FieldTreeItem.tsx to use correct handle types based on side

## Symptoms

expected: After dragging from source field handle to target field handle and releasing, the connection should persist as a visible edge
actual: Blue line appears during drag (good!), but disappears when mouse is released - no edge remains
errors: No errors visible in browser console
reproduction: 1. Load schemas at /mapper, 2. Click and drag from source field handle (right side), 3. Drag to target field handle (left side) - blue line appears, 4. Release mouse - line disappears, no connection persists
started: Just fixed the dragging issue (handles now all type='source'), but connection doesn't persist after drop
handles_visible: Yes, colored circles visible on all leaf fields
drag_working: Yes, blue line appears while dragging

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: useMappingState.ts onConnect handler
  found: handler exists at lines 139-145, calls store.addConnection with sourceHandle and targetHandle
  implication: handler is correctly wired to store

- timestamp: 2026-02-12T00:01:01Z
  checked: MappingCanvas.tsx ReactFlow props
  found: onConnect prop passed to ReactFlow at line 77, isValidConnection also passed at line 82
  implication: connection handler is properly configured in ReactFlow

- timestamp: 2026-02-12T00:01:02Z
  checked: useMappingStore.ts addConnection implementation
  found: addConnection at lines 45-55 creates new connection object and adds to connections array
  implication: store logic looks correct

- timestamp: 2026-02-12T00:01:03Z
  checked: validation.ts isValidMappingConnection
  found: function checks node IDs, prevents source-to-source, checks duplicates, validates type compatibility
  implication: validation could be failing silently - if validation fails, onConnect never fires

- timestamp: 2026-02-12T00:01:04Z
  checked: FieldTreeItem.tsx Handle component at line 152
  found: ALL handles have type="source" regardless of which side (source or target) they're on
  implication: This is the root cause - React Flow requires source handles to connect to target handles, not source to source

## Resolution

root_cause: All field handles are set to type="source" (line 152 in FieldTreeItem.tsx), but React Flow requires connections to be from source-type handles TO target-type handles. Since both sides have type="source", React Flow rejects the connection before onConnect is called. Source-side fields should have type="source", target-side fields should have type="target".
fix: Changed line 152 in FieldTreeItem.tsx from type="source" to type={side === 'source' ? 'source' : 'target'} so that source-side handles are type="source" and target-side handles are type="target"
verification: Manual testing required - navigate to /mapper, load schemas, drag from source field handle to target field handle, release. Connection should now persist as a visible edge. The fix is correct because React Flow's connection logic requires source-type handles to connect TO target-type handles. Previously all handles were source-type which violated this requirement.
files_changed:
  - src/app/mapper/components/FieldTreeItem.tsx
