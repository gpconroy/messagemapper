---
phase: quick-4
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mapper/components/FieldTreeNode.tsx
  - src/app/mapper/hooks/useMappingState.ts
autonomous: true
must_haves:
  truths:
    - "User can drag the edges/corners of the source and target field tree boxes to resize them"
    - "Resized boxes maintain scrollable field list content"
    - "Resize handles are visible on hover/selection and do not interfere with field interactions"
  artifacts:
    - path: "src/app/mapper/components/FieldTreeNode.tsx"
      provides: "NodeResizer integration with dynamic width/height"
      contains: "NodeResizer"
    - path: "src/app/mapper/hooks/useMappingState.ts"
      provides: "Initial node dimensions for resizable nodes"
      contains: "width"
  key_links:
    - from: "src/app/mapper/components/FieldTreeNode.tsx"
      to: "@xyflow/react NodeResizer"
      via: "import and render inside node component"
      pattern: "NodeResizer"
---

<objective>
Add resize capability to the source and target field tree boxes on the mapping canvas so users can drag to resize them.

Purpose: Users viewing large schemas need to adjust box sizes to see more fields at once or save screen space.
Output: Resizable field tree nodes using React Flow's built-in NodeResizer component.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/app/mapper/components/FieldTreeNode.tsx
@src/app/mapper/hooks/useMappingState.ts
@src/app/mapper/components/MappingCanvas.tsx
@src/app/mapper/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add NodeResizer to FieldTreeNode and make dimensions dynamic</name>
  <files>
    src/app/mapper/components/FieldTreeNode.tsx
    src/app/mapper/hooks/useMappingState.ts
  </files>
  <action>
**In `src/app/mapper/hooks/useMappingState.ts`:**

Add explicit `width` and `height` properties to both source and target node definitions. These are required for NodeResizer to function. Set initial dimensions:
- `width: 288` (equivalent to current `w-72` = 18rem = 288px)
- `height: 500` (reasonable default for field trees)

Keep `draggable: false` -- NodeResizer works independently of draggable.

For the target node, update `position: { x: 600, y: 0 }` to `position: { x: 700, y: 0 }` to give a bit more room for wider source nodes after resize.

**In `src/app/mapper/components/FieldTreeNode.tsx`:**

1. Import `NodeResizer` from `@xyflow/react`.

2. Replace the fixed `w-72` class on the outer div with dynamic sizing. The component needs to fill its node container, so change the outer div to:
   ```
   className="w-full h-full bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden flex flex-col"
   ```
   This makes the component fill whatever size the React Flow node is.

3. Add `<NodeResizer />` as the first child inside the outer div (or just before it, as a sibling inside the fragment). Configure it with:
   - `minWidth={200}` -- minimum usable width for field names
   - `minHeight={200}` -- minimum usable height for header + a few fields
   - `maxWidth={800}` -- prevent excessively wide nodes
   - `maxHeight={900}` -- prevent excessively tall nodes
   - `color="#3b82f6"` (blue-500) for source side, `color="#22c55e"` (green-500) for target side -- use `data.side` to determine which color. This makes the resize handles match the panel color scheme.
   - `handleStyle={{ width: 8, height: 8 }}` for slightly larger grab handles

4. The field list area (currently `max-h-[70vh]`) should change to `flex-1 overflow-y-auto min-h-0 nowheel nopan` so it fills remaining space in the flex column and scrolls within whatever height the user resizes to. Remove the `max-h-[70vh]` class entirely.

5. Wrap the component return in a fragment `<>...</>` so NodeResizer can be a sibling of the main div, OR place NodeResizer inside the outer div as the first child. The React Flow docs show NodeResizer as a sibling alongside other content inside the node. Place it inside the outer div as the first child element.

Important: Do NOT change the handle positioning logic in FieldTreeItem -- the source/target handles on individual fields must continue to work for drawing connections. NodeResizer handles are separate from connection handles.
  </action>
  <verify>
    Run `npx next build` or `npx next dev` and verify no TypeScript/build errors. Load the mapper page, upload source and target schemas, and confirm:
    1. Blue resize handles appear on the source field tree box edges/corners
    2. Green resize handles appear on the target field tree box edges/corners
    3. Dragging a corner resizes the box and the field list scrolls within the new size
    4. Field connections (drawing edges) still work correctly
    5. Nodes remain non-draggable (fixed position)
  </verify>
  <done>
    Source and target field tree boxes on the mapping canvas can be resized by dragging their edges/corners. The field list content scrolls within the resized area. Minimum size prevents unusable tiny boxes. Connection handles on fields continue to work for mapping.
  </done>
</task>

</tasks>

<verification>
- NodeResizer renders on both source and target field tree nodes
- Resize handles are visually distinct (blue for source, green for target)
- Dragging resize handles changes box dimensions
- Field list scrolls within resized container
- Drawing connections between fields still works
- Nodes stay in fixed positions (not draggable)
- No TypeScript errors
</verification>

<success_criteria>
User can grab the edges or corners of the source/target field tree boxes and drag to resize them. The field content area adjusts to fill the new size with scrolling as needed.
</success_criteria>

<output>
After completion, create `.planning/quick/4-i-need-to-be-able-to-resize-the-boxes-wh/4-SUMMARY.md`
</output>
