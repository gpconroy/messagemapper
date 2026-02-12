---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mapper/page.tsx
autonomous: true
must_haves:
  truths:
    - "The header bar at the top of the mapper page has a green background"
    - "The MessageMapper title text is clearly readable against the green background"
  artifacts:
    - path: "src/app/mapper/page.tsx"
      provides: "Green header bar"
      contains: "bg-green"
  key_links: []
---

<objective>
Make the MessageMapper header bar green at the top of the mapper page.

Purpose: Visual branding — the user wants the top header bar to be green instead of white.
Output: Updated mapper page with green header.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mapper/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change mapper header background to green</name>
  <files>src/app/mapper/page.tsx</files>
  <action>
In src/app/mapper/page.tsx, update the header element (line 26) to use a green background with appropriate text colors:

1. Change `bg-white border-b border-gray-200` to `bg-green-600 border-b border-green-700` on the header element.
2. Change the "MessageMapper" h1 text color from `text-gray-900` to `text-white` so it is readable against the green background.
3. Change the "Back" link from `text-blue-600 hover:text-blue-800` to `text-white/80 hover:text-white` so it is visible against the green background.

Keep all other classes (padding, layout, font sizes) unchanged.
  </action>
  <verify>Run `npm run build` to confirm no compilation errors. Visually inspect at http://localhost:3000/mapper that the header bar is green with white text.</verify>
  <done>The mapper page header has a green background (bg-green-600) with white readable text for both the title and back link.</done>
</task>

</tasks>

<verification>
- The header element in mapper/page.tsx uses bg-green-600
- Text elements use white/light colors for contrast
- No build errors
</verification>

<success_criteria>
The top bar of the mapper page is visibly green with the "MessageMapper" title in white text.
</success_criteria>

<output>
After completion, create `.planning/quick/1-make-the-messagemapper-green-on-the-top-/1-SUMMARY.md`
</output>
