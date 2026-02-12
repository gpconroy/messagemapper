---
phase: quick-3
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mapper/components/FieldTreeNode.tsx
autonomous: true
must_haves:
  truths:
    - "No blank space appears to the right of the field tree scrollbar"
    - "Field tree nodes render at a consistent width across header, search, and field list sections"
    - "Scrollbar appears only when field list content overflows the max height"
  artifacts:
    - path: "src/app/mapper/components/FieldTreeNode.tsx"
      provides: "Fixed-width field tree node without blank space gap"
      contains: "w-72"
  key_links:
    - from: "FieldTreeNode container div"
      to: "scrollable field list div"
      via: "consistent width constraint"
      pattern: "w-72"
---

<objective>
Fix blank space appearing to the right of the vertical scrollbar in the loaded field tree nodes.

Purpose: The FieldTreeNode component has a width inconsistency -- the scrollable field list is constrained to `w-72` (288px) but the parent container and header/search sections have no fixed width. When the header content (with "Expand All" / "Collapse All" buttons) renders wider than 288px, the parent stretches to accommodate it, leaving blank space to the right of the narrower field list scrollbar.

Output: Field tree nodes with consistent width where no blank space appears beside the scrollbar.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mapper/components/FieldTreeNode.tsx
@src/app/mapper/components/FieldTreeItem.tsx
@src/app/mapper/components/MappingCanvas.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix FieldTreeNode width consistency to eliminate blank space</name>
  <files>src/app/mapper/components/FieldTreeNode.tsx</files>
  <action>
Move the `w-72` width constraint from the scrollable field list div (line 123) up to the outermost container div (line 77). This ensures the entire node -- header, search input, and field list -- all share the same fixed width, eliminating the gap where the parent container was wider than the field list.

Specific changes in `FieldTreeNode.tsx`:

1. On the outermost container div (currently line 77):
   - Change: `className="bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden"`
   - To: `className="w-72 bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden"`

2. On the scrollable field list div (currently line 123):
   - Change: `className="w-72 max-h-[70vh] overflow-y-auto nowheel nopan"`
   - To: `className="max-h-[70vh] overflow-y-auto nowheel nopan"`

This moves the width constraint to the parent so all child sections (header, search, field list) are equally constrained. The header buttons will truncate or wrap within the 288px boundary instead of stretching the container. The scrollbar will sit flush against the right edge of the node with no blank space beyond it.

Do NOT change the `w-72` value itself -- 288px is the correct width for the field tree panels. Only move WHERE the constraint is applied.
  </action>
  <verify>
Run the dev server and load source/target schemas. Verify:
- `npm run build` completes without errors
- Visual: field tree nodes have no blank space to the right of the scrollbar
- Visual: header, search, and field list are all the same width
- Visual: scrollbar only appears when fields overflow the max-height
  </verify>
  <done>
Field tree nodes render with consistent width across all sections. No blank space appears to the right of the vertical scrollbar. The scrollbar sits flush against the right edge of the node boundary.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes without errors
- Field tree nodes display without blank space to the right of the scrollbar
- Both source and target field tree nodes render identically in terms of width consistency
- Header buttons (Expand All / Collapse All) fit within the node width
- Search input fits within the node width
- Scrollbar appears only when content exceeds max-height
</verification>

<success_criteria>
- No blank space visible to the right of the field tree scrollbar
- All three sections (header, search, field list) share the same width boundary
- Build passes, no visual regressions in field tree rendering
</success_criteria>

<output>
After completion, create `.planning/quick/3-in-the-loaded-files-there-is-a-vertical-/3-SUMMARY.md`
</output>
