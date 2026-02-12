---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mapper/components/FieldTreeItem.tsx
  - src/app/mapper/hooks/useMappingState.ts
  - src/app/mapper/components/MappingCanvas.tsx
autonomous: true
must_haves:
  truths:
    - "User can drag from a source field handle to a target field handle to create a mapping connection"
    - "Connection handles are visible and clickable on both source and target field tree nodes"
    - "Existing connections (edges) remain visible after node resize or panel toggle"
    - "NodeResizer still works for resizing field tree boxes"
  artifacts:
    - path: "src/app/mapper/components/FieldTreeItem.tsx"
      provides: "Field items with reliable, visible connection handles using inline styles"
    - path: "src/app/mapper/hooks/useMappingState.ts"
      provides: "Proper onEdgesChange handler that processes React Flow edge update events"
    - path: "src/app/mapper/components/MappingCanvas.tsx"
      provides: "Canvas with correct connection drawing configuration"
  key_links:
    - from: "src/app/mapper/components/FieldTreeItem.tsx"
      to: "src/app/mapper/components/MappingCanvas.tsx"
      via: "Handle components with field.path IDs connect to onConnect callback"
      pattern: "<Handle.*id=\\{field\\.path\\}"
    - from: "src/app/mapper/hooks/useMappingState.ts"
      to: "src/app/mapper/components/MappingCanvas.tsx"
      via: "onEdgesChange propagated to ReactFlow component"
      pattern: "onEdgesChange"
---

<objective>
Diagnose and fix the repeated disappearance of connection handles / inability to draw connectors between source and target fields in the mapping canvas.

Purpose: This is the SECOND regression of the same core functionality (first was quick task 6). Drawing connections between fields is the fundamental value of the application. The previous fix addressed overflow-hidden clipping and z-index competition with NodeResizer. Since those fixes are still in the code, there is a different or additional root cause this time.

Output: Permanently restored and hardened connection handle visibility and drag-to-connect functionality.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mapper/components/FieldTreeItem.tsx
@src/app/mapper/components/FieldTreeNode.tsx
@src/app/mapper/components/MappingCanvas.tsx
@src/app/mapper/hooks/useMappingState.ts
@src/app/mapper/page.tsx
@src/app/mapper/lib/validation.ts
@.planning/quick/6-something-has-gone-wrong-i-can-no-longer/6-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Diagnose the connector regression and apply comprehensive fix</name>
  <files>
    src/app/mapper/components/FieldTreeItem.tsx
    src/app/mapper/hooks/useMappingState.ts
    src/app/mapper/components/MappingCanvas.tsx
  </files>
  <action>
This is the SECOND time connectors have disappeared. The quick task 6 fix (overflow-visible, z-index: 10 on handles) is still in the code. There are multiple potential causes to investigate and fix systematically. Start the dev server if not already running (`npx next dev`) and open http://localhost:3000/mapper in the browser. Load source and target schemas, expand fields, and observe whether:
- (A) Handles are NOT visible at all (rendering/CSS issue)
- (B) Handles are visible but dragging does NOT start a connection line (event capture issue)
- (C) Connection line appears but cannot complete the connection (validation issue)

Use the browser DevTools to inspect Handle elements. Check the browser console for React Flow warnings or errors.

**Root cause investigation and fixes (apply ALL of these regardless of which specific symptom is observed, to harden against future regressions):**

**Fix 1: Replace dynamic Tailwind classes on Handle with pure inline styles (FieldTreeItem.tsx)**

The Handle component currently uses a mix of Tailwind `!important` classes and inline styles:
```jsx
className={`!w-3 !h-3 !border-2 ${side === 'source' ? `!right-0 !${handleColor}` : `!left-0 !${handleColor}`}`}
style={{ background: ..., borderColor: ..., zIndex: 10 }}
```

Problems with this approach:
1. The `!${handleColor}` template creates `!bg-blue-500 border-blue-600` - only the first class gets the `!` prefix
2. Tailwind v4 (4.1.18, which this project uses) may not reliably apply `!` prefix important overrides on dynamically constructed class names
3. React Flow's default Handle styles may override Tailwind classes depending on CSS specificity and load order
4. The inline `style` already sets `background` and `borderColor`, making the className color classes redundant but confusing

**Replace the entire Handle component's className and style with a comprehensive inline style object.** This eliminates ALL CSS specificity battles:

```tsx
{showHandle && (
  <Handle
    type={side === 'source' ? 'source' : 'target'}
    position={side === 'source' ? Position.Right : Position.Left}
    id={field.path}
    style={{
      width: 12,
      height: 12,
      border: '2px solid',
      borderRadius: '50%',
      background: mappingStatus === 'mapped' ? '#22c55e' : side === 'source' ? '#2563eb' : '#22c55e',
      borderColor: mappingStatus === 'mapped' ? '#16a34a' : side === 'source' ? '#1e40af' : '#16a34a',
      zIndex: 50,
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      ...(side === 'source'
        ? { right: -6 }
        : { left: -6 }),
      cursor: 'crosshair',
      pointerEvents: 'auto' as const,
    }}
  />
)}
```

Key changes from current code:
- Remove ALL className from Handle (no more Tailwind class battles)
- Use `width: 12, height: 12` instead of `!w-3 !h-3` for reliable sizing
- Use `right: -6` / `left: -6` to position handle half outside the node boundary (6px = half of 12px width) so it's grabbable
- Increase z-index from 10 to 50 to definitively sit above NodeResizer (which can be at z-index 5-20 depending on version)
- Add explicit `pointerEvents: 'auto'` to guarantee the handle captures mouse events
- Add `cursor: 'crosshair'` so user gets visual feedback that the handle is interactive
- Add `position: 'absolute'` and centering to ensure consistent placement

Also remove the `handleColor` variable declaration (lines ~61-68) since it's no longer used.

**Fix 2: Fix the no-op onEdgesChange in useMappingState.ts**

Currently at line 155:
```ts
const onEdgesChange: OnEdgesChange = useCallback(() => {}, [])
```

This no-op causes React Flow to be unable to process ANY edge change events. In React Flow v12 (controlled component pattern), `onEdgesChange` is called for edge selection, edge position recalculation after node resize, and edge removal via keyboard. A complete no-op breaks these behaviors.

Replace the no-op with a handler that processes edge removal events (which come through onEdgesChange when user selects and deletes edges via the UI) but ignores other edge changes (since edges are derived from the store):

```ts
import { applyEdgeChanges } from '@xyflow/react'
```

Add `applyEdgeChanges` to the import from `@xyflow/react`. Then replace the no-op:

```ts
// Handle edge changes - process removals through the store, ignore position updates
// (edges are derived from store.connections, so we only need to handle delete events)
const onEdgesChange: OnEdgesChange = useCallback(
  (changes) => {
    const removals = changes.filter((change) => change.type === 'remove')
    if (removals.length > 0) {
      const idsToRemove = removals.map((r) => r.id)
      store.removeConnections(idsToRemove)
    }
  },
  [store]
)
```

This keeps edges derived from the store (the source of truth) while allowing React Flow's internal edge lifecycle to function properly. Without this, React Flow may get into an inconsistent internal state where it thinks edges exist but cannot interact with them.

**Fix 3: Verify MappingCanvas connection configuration (MappingCanvas.tsx)**

Check that the ReactFlow component is not missing any props that could prevent connections. If the following props are missing, add them:

- Ensure `connectionLineType="smoothstep"` is present on the ReactFlow component (match the default edge type)
- Ensure the `edgeTypes` includes both `transformation` and the default type. Add a `smoothstep` entry if React Flow v12 requires explicit registration:

Check if custom edge types need to include the default type. In React Flow v12, if `edgeTypes` is provided, ONLY those types are available. The default `smoothstep` type should still work without registration, but verify by checking the React Flow v12 docs or testing.

Add `connectionLineType` prop to ReactFlow:
```tsx
<ReactFlow
  ...existing props...
  connectionLineType={ConnectionLineType.SmoothStep}
  ...
>
```

Import `ConnectionLineType` from `@xyflow/react` if needed. If `ConnectionLineType` is not available in v12, use the string `"smoothstep"` instead.

**After all fixes, test thoroughly:**

1. Start/restart dev server (`npx next dev`)
2. Navigate to http://localhost:3000/mapper
3. Upload source and target schemas
4. Expand fields in both trees
5. Hover over a leaf field's handle - cursor should change to crosshair
6. Drag from source handle to target handle - blue connection line should appear during drag
7. Release on target handle - edge should be created
8. Create 2-3 connections, then try deleting one (click edge, press Backspace)
9. Resize a field tree box using NodeResizer - edges should reposition correctly
10. Toggle the bottom panel open/closed - edges should remain visible
11. Check undo/redo (Ctrl+Z, Ctrl+Shift+Z) still works for connections
  </action>
  <verify>
    1. Run `npx tsc --noEmit` to verify no TypeScript errors
    2. Load source and target schemas at http://localhost:3000/mapper
    3. Expand fields and verify handle dots are visible on leaf fields (colored circles at left/right edges)
    4. Drag from a source field handle to a target field handle - connection line appears during drag
    5. Drop on target - edge is created and visible
    6. Delete an edge (click + Backspace) - edge disappears
    7. Resize a node box - edges reposition
    8. Undo/redo connections with Ctrl+Z / Ctrl+Shift+Z
  </verify>
  <done>
    - Connection handles are visible on all leaf fields and collapsed parents
    - Dragging from source handle to target handle creates a connection
    - Connection line appears during drag with smoothstep style
    - Edges can be deleted via selection + Backspace
    - Edges reposition correctly after NodeResizer resize
    - Undo/redo works for connection changes
    - No TypeScript compilation errors
    - NodeResizer still functions
    - Bottom panel toggle does not affect edge visibility
  </done>
</task>

</tasks>

<verification>
- Load source and target schemas in the mapper page
- Draw at least 2 connections between source and target leaf fields
- Verify connections appear as colored edges on the canvas
- Delete one connection (select + Backspace) and verify it is removed
- Resize a field tree box and verify handles and edges still work after resize
- Toggle bottom panel and verify edges remain visible
- Verify undo/redo works for connections (Ctrl+Z / Ctrl+Shift+Z)
- Verify transformation dialog still opens on edge click
</verification>

<success_criteria>
- Field-to-field connection drawing is fully restored and hardened against CSS specificity issues
- Handle visibility guaranteed via inline styles (no Tailwind class dependency)
- Edge lifecycle properly managed via onEdgesChange handler (no more no-op)
- No regressions in existing mapping functionality (delete, undo/redo, transformations, resize)
- TypeScript compilation passes
</success_criteria>

<output>
After completion, create `.planning/quick/8-the-ability-to-add-connectors-has-disapp/8-SUMMARY.md`
</output>
