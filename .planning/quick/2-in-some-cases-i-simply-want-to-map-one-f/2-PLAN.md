---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/transformations/types.ts
  - src/transformations/builtins/direct.ts
  - src/transformations/registry.ts
  - src/transformations/validator.ts
  - src/transformations/index.ts
  - src/app/api/transformations/route.ts
  - src/app/mapper/components/TransformationDialog.tsx
  - src/app/mapper/components/TransformationBadge.tsx
  - src/transformations/__tests__/builtins.test.ts
  - src/transformations/__tests__/pipeline.test.ts
autonomous: true
must_haves:
  truths:
    - "User can select 'Direct Mapping' as a transformation type on any connection"
    - "Direct mapping passes source field value to target field unchanged"
    - "Direct mapping requires no configuration from the user"
    - "Direct mapping works through the full pipeline (validation, execution, dry-run)"
  artifacts:
    - path: "src/transformations/builtins/direct.ts"
      provides: "Passthrough transform function"
    - path: "src/transformations/types.ts"
      provides: "direct type in TransformationType union"
      contains: "direct"
  key_links:
    - from: "src/transformations/registry.ts"
      to: "src/transformations/builtins/direct.ts"
      via: "registry.set('direct', directMap)"
      pattern: "transformRegistry\\.set\\('direct'"
    - from: "src/transformations/validator.ts"
      to: "src/transformations/types.ts"
      via: "Zod enum includes 'direct'"
      pattern: "'direct'"
---

<objective>
Add a "direct" (passthrough) transformation type that copies a source field value to a target field without any transformation.

Purpose: Many field mappings are simple 1:1 copies (e.g., source.orderId -> target.orderReference). Currently the user must pick a transformation type like "constant" or work around the system. A dedicated "direct" type makes this the simplest, most obvious option.

Output: Full-stack `direct` transformation type -- type definition, builtin function, registry, validator, API route, UI dialog option, badge display, and tests.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/transformations/types.ts
@src/transformations/registry.ts
@src/transformations/validator.ts
@src/transformations/index.ts
@src/transformations/pipeline.ts
@src/transformations/builtins/constant.ts
@src/app/api/transformations/route.ts
@src/app/mapper/components/TransformationDialog.tsx
@src/app/mapper/components/TransformationBadge.tsx
@src/app/mapper/store/useMappingStore.ts
@src/types/mapping-types.ts
@src/transformations/__tests__/builtins.test.ts
@src/transformations/__tests__/pipeline.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add direct transformation type across backend stack</name>
  <files>
    src/transformations/types.ts
    src/transformations/builtins/direct.ts
    src/transformations/registry.ts
    src/transformations/validator.ts
    src/transformations/index.ts
    src/app/api/transformations/route.ts
  </files>
  <action>
1. In `src/transformations/types.ts`:
   - Add `'direct'` to the `TransformationType` union (place it FIRST in the list since it is the simplest/most common mapping type)
   - Add a `DirectConfig` interface: `export interface DirectConfig {}` (empty -- no configuration needed)

2. Create `src/transformations/builtins/direct.ts`:
   - Export a `directMap` function with signature `(input: unknown, _config: DirectConfig): unknown`
   - Implementation: simply `return input;` -- pure passthrough
   - Follow the pattern of `constant.ts` (import config type, single export)

3. In `src/transformations/registry.ts`:
   - Import `directMap` from `./builtins/direct`
   - Register it: `transformRegistry.set('direct', directMap as unknown as TransformFunction);`
   - Place the registration FIRST (before format_date) since it is the simplest type

4. In `src/transformations/validator.ts`:
   - Add `'direct'` to the `z.enum([...])` array in `TransformationRuleSchema` (first position)
   - Add `DirectConfigSchema = z.object({})` (empty object schema, accept any empty config)
   - Add `direct: DirectConfigSchema` to the `configSchemaMap` object

5. In `src/transformations/index.ts`:
   - Add `DirectConfig` to the type exports from `./types`
   - Add `DirectConfigSchema` to the exports from `./validator`

6. In `src/app/api/transformations/route.ts`:
   - Add `'direct'` to the `TRANSFORMATION_TYPES` array (first position)
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. Run `npx jest --testPathPattern="transformations" --passWithNoTests` to confirm existing tests still pass.</verify>
  <done>The `direct` transformation type is recognized throughout the backend: type system, builtin function, registry, validator, and API route all accept and handle it.</done>
</task>

<task type="auto">
  <name>Task 2: Add direct mapping to UI and write tests</name>
  <files>
    src/app/mapper/components/TransformationDialog.tsx
    src/app/mapper/components/TransformationBadge.tsx
    src/transformations/__tests__/builtins.test.ts
    src/transformations/__tests__/pipeline.test.ts
  </files>
  <action>
1. In `src/app/mapper/components/TransformationDialog.tsx`:
   - Add `{ value: 'direct', label: 'Direct Mapping' }` as the FIRST entry in the `TRANSFORMATION_TYPES` array
   - Change the default `selectedType` state from `'format_date'` to `'direct'` (line 40) -- direct mapping should be the default since it is the most common case
   - In `renderConfigForm()`, add a case for `'direct'` that returns: `<div className="text-sm text-gray-500">No configuration needed. The source field value will be copied directly to the target field.</div>`

2. In `src/app/mapper/components/TransformationBadge.tsx`:
   - Add a case for `'direct'` returning the arrow abbreviation `'->'` (visually represents direct pass-through)

3. In `src/transformations/__tests__/builtins.test.ts`:
   - Add a `describe('directMap', ...)` block with these tests:
     - `it('passes through string values unchanged')` -- directMap('hello', {}) returns 'hello'
     - `it('passes through number values unchanged')` -- directMap(42, {}) returns 42
     - `it('passes through null unchanged')` -- directMap(null, {}) returns null
     - `it('passes through objects unchanged')` -- directMap({a: 1}, {}) returns {a: 1}
     - `it('is callable via executeTransform')` -- await executeTransform('direct', 'test', {}) returns 'test'
   - Import `directMap` from `../builtins/direct`

4. In `src/transformations/__tests__/pipeline.test.ts`:
   - Add a test inside `describe('Pipeline Execution', ...)`:
     - `it('should execute direct mapping without transformation')` -- data { name: 'Alice' }, rule type 'direct', sourceFields ['name'], targetField 'displayName', config {}, order 0 -- expect result.displayName === 'Alice'
   - Update the test `'should validate all 8 transformation types'` in `describe('Validator Direct Tests', ...)`:
     - Rename to `'should validate all 9 transformation types'`
     - Add a direct rule: `{ id: 'r0', type: 'direct', sourceFields: ['field'], targetField: 'mapped', config: {}, order: -1 }` (or adjust order to fit at beginning)
     - Update expectation from `toHaveLength(8)` to `toHaveLength(9)`
  </action>
  <verify>Run `npx jest --testPathPattern="transformations" --verbose` -- all tests pass including new direct mapping tests. Run `npx tsc --noEmit` for type safety.</verify>
  <done>Direct mapping appears as the first (default) option in the transformation dialog, shows a '->' badge on edges, and has full test coverage for the builtin function, pipeline execution, and validation.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `npx jest --testPathPattern="transformations" --verbose` -- all tests pass
- The `direct` type appears in: TransformationType union, registry, validator enum, configSchemaMap, API route types array, dialog dropdown, badge abbreviations
- Direct mapping is the DEFAULT selection when opening the transformation dialog
</verification>

<success_criteria>
- User can select "Direct Mapping" from the transformation type dropdown (it is the first/default option)
- Direct mapping passes the source value through unchanged (string, number, null, object all work)
- No configuration form is shown -- just a message saying no config is needed
- Badge shows "->" on edges with direct mapping
- All existing tests continue to pass
- New tests cover direct mapping in builtins, pipeline, and validation
</success_criteria>

<output>
After completion, create `.planning/quick/2-in-some-cases-i-simply-want-to-map-one-f/2-SUMMARY.md`
</output>
