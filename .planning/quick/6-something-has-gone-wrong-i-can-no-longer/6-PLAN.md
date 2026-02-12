---
phase: quick-6
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mapper/components/FieldTreeNode.tsx
  - src/app/mapper/components/FieldTreeItem.tsx
autonomous: true
must_haves:
  truths:
    - "User can drag from a source field handle to a target field handle to create a mapping connection"
    - "Connection handles are visible and interactive on both source and target field tree nodes"
    - "NodeResizer still works for resizing field tree boxes"
  artifacts:
    - path: "src/app/mapper/components/FieldTreeNode.tsx"
      provides: "Field tree node with non-clipping container and working handles"
    - path: "src/app/mapper/components/FieldTreeItem.tsx"
      provides: "Field items with properly accessible connection handles"
  key_links:
    - from: "src/app/mapper/components/FieldTreeItem.tsx"
      to: "src/app/mapper/components/MappingCanvas.tsx"
      via: "Handle components with field.path IDs connect to onConnect callback"
      pattern: "<Handle.*id=\\{field\\.path\\}"
---

<objective>
Fix broken field-to-field connection drawing in the mapping canvas.

Purpose: After quick task 4 (NodeResizer addition), users can no longer drag connections between source and target fields. This is a critical regression -- field mapping is the core value of the application. The root cause is almost certainly the interaction between the NodeResizer addition and the Handle components used for connection drawing.

Output: Restored ability to draw connections between source and target field handles while preserving the resize capability.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mapper/components/FieldTreeNode.tsx
@src/app/mapper/components/FieldTreeItem.tsx
@src/app/mapper/components/MappingCanvas.tsx
@src/app/mapper/hooks/useMappingState.ts
@src/app/mapper/lib/validation.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Diagnose and fix Handle interaction broken by NodeResizer</name>
  <files>
    src/app/mapper/components/FieldTreeNode.tsx
    src/app/mapper/components/FieldTreeItem.tsx
  </files>
  <action>
The connection drawing broke after quick task 4 added NodeResizer to FieldTreeNode. There are three interrelated issues to investigate and fix in order of likelihood:

**Issue 1: `overflow-hidden` clipping Handle components**

The outer div in FieldTreeNode.tsx has `overflow-hidden` which clips content at the node boundary. React Flow Handle components render at Position.Right (source) and Position.Left (target), meaning they sit exactly on the node edge. With `overflow-hidden`, the half of the handle that protrudes outside the node boundary is clipped, and the remaining visible area may not register pointer events correctly.

Fix: Change `overflow-hidden` on the outermost div to `overflow-visible`. The NodeResizer and internal layout should not need `overflow-hidden` on the outer wrapper -- the scrollable field list already has `overflow-y-auto` on its own container. If removing `overflow-hidden` from the outer div causes visual overflow issues with the field list or search area, keep `overflow-hidden` only on the specific child containers that need it (the field list div already has `overflow-y-auto` with `min-h-0`), not on the outermost wrapper.

Specifically in FieldTreeNode.tsx, change the outer div from:
```
className="w-full h-full bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden flex flex-col"
```
to:
```
className="w-full h-full bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-visible flex flex-col"
```

Note: `rounded-lg` with `overflow-visible` means the border radius won't clip children. This is acceptable because the internal containers (header, search, field list) handle their own backgrounds. If the rounded corners look wrong without overflow-hidden, add `overflow-hidden` individually to the header div and the field list div, but NOT to the outer wrapper.

**Issue 2: NodeResizer z-index competing with Handles**

NodeResizer renders invisible resize zones on all edges and corners of the node. These resize zones may sit on top of the Handle components and intercept pointer events (mousedown/drag) before they reach the Handle.

Fix: Add a `style` prop to the Handle components in FieldTreeItem.tsx to ensure they have a higher z-index than the NodeResizer. Add `zIndex: 10` to the existing `style` prop on each Handle. The NodeResizer resize handles typically render at z-index 5 or default.

In FieldTreeItem.tsx, update the Handle component's style prop from:
```jsx
style={{
  background: ...,
  borderColor: ...,
}}
```
to:
```jsx
style={{
  background: ...,
  borderColor: ...,
  zIndex: 10,
}}
```

**Issue 3: Verify the `nowheel nopan` classes on the field list div**

The field list container has `nowheel nopan` classes that tell React Flow not to capture wheel and pan events. However, connection drawing requires `mousedown` and `drag` events on Handle components. Verify that the `nowheel nopan` classes are NOT blocking these events. If connections still don't work after fixes 1 and 2, also add the `nodrag` class to the field list container to prevent React Flow's node drag handler from capturing events within the scrollable area. Note: the nodes are already set to `draggable: false`, but having `nodrag` on the container provides belt-and-suspenders protection.

After making changes, start the dev server (`npx next dev`) and test:
1. Load two schema files (use the sample files in the project root if available, or upload any JSON/XML)
2. Expand fields in both source and target trees
3. Try to drag from a source field handle (right edge) to a target field handle (left edge)
4. A blue connection line should appear during drag and a connection should be created on release

If the connection STILL does not work after all three fixes, check the browser dev console for errors and look for React Flow warnings about handle IDs or connection validation failures.
  </action>
  <verify>
    1. Run `npx next build` to verify no TypeScript errors.
    2. Run `npx next dev` and navigate to http://localhost:3000/mapper.
    3. Upload a source and target file.
    4. Expand fields and attempt to draw a connection from a source field to a target field.
    5. Connection line should appear during drag and edge should be created on drop.
    6. Verify NodeResizer still works (grab a corner/edge of a field tree box and drag to resize).
    7. Verify field list still scrolls properly within the box.
  </verify>
  <done>
    - Users can draw connections between source and target field handles
    - Connection lines appear during drag
    - Edges are created when dropping on a valid target handle
    - NodeResizer still functions for box resizing
    - Field list scrolling still works within the boxes
    - No TypeScript compilation errors
  </done>
</task>

</tasks>

<verification>
- Load source and target schemas in the mapper page
- Draw at least one connection between a source and target leaf field
- Verify the connection appears as a blue edge on the canvas
- Delete the connection (select + Backspace) and verify it's removed
- Resize a field tree box and verify handles still work after resize
- Verify undo/redo still works for connections (Ctrl+Z / Ctrl+Shift+Z)
</verification>

<success_criteria>
- Field-to-field connection drawing is fully restored
- NodeResizer remains functional
- No regressions in existing mapping functionality (delete, undo/redo, transformations)
- TypeScript compilation passes
</success_criteria>

<output>
After completion, create `.planning/quick/6-something-has-gone-wrong-i-can-no-longer/6-SUMMARY.md`
</output>
