---
phase: quick-7
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/sample-data-extractor.ts
  - src/app/api/parse-sample-data/route.ts
  - src/app/mapper/components/SampleDataInput.tsx
  - src/app/mapper/components/PreviewPanel.tsx
  - src/app/mapper/components/PreviewResults.tsx
  - src/app/mapper/page.tsx
autonomous: true
must_haves:
  truths:
    - "User can upload a sample source file (JSON or XML) containing real values to test their mappings"
    - "System extracts values from the uploaded file and maps them through ALL connections (direct and transformed) to produce a target output"
    - "User sees the resulting target output as formatted JSON in the preview panel"
  artifacts:
    - path: "src/lib/sample-data-extractor.ts"
      provides: "Utility to flatten parsed file data into path-keyed value map and build nested target output from connections"
    - path: "src/app/api/parse-sample-data/route.ts"
      provides: "API endpoint that parses an uploaded sample file and returns a flat path-to-value map"
    - path: "src/app/mapper/components/SampleDataInput.tsx"
      provides: "File upload UI replacing the JSON textarea for sample data entry"
    - path: "src/app/mapper/components/PreviewPanel.tsx"
      provides: "Updated orchestrator that uploads file, runs ALL connections through preview, displays target output"
  key_links:
    - from: "src/app/mapper/components/PreviewPanel.tsx"
      to: "/api/parse-sample-data"
      via: "fetch POST with FormData file upload"
      pattern: "fetch.*parse-sample-data"
    - from: "src/app/mapper/components/PreviewPanel.tsx"
      to: "/api/transformations/preview"
      via: "fetch POST for transformation execution"
      pattern: "fetch.*transformations/preview"
    - from: "src/lib/sample-data-extractor.ts"
      to: "src/app/mapper/components/PreviewPanel.tsx"
      via: "flattenToPathMap and buildTargetOutput imports"
      pattern: "import.*sample-data-extractor"
---

<objective>
Replace the manual JSON textarea in the Preview panel with file upload, and make the preview process ALL connections (not just transformed ones) to produce a complete target output document.

Purpose: Currently the "Test with Sample Data" feature requires users to manually type JSON into a textarea, and it only previews connections that have explicit transformation rules. The user wants to upload an actual sample source file (the same formats they already use: JSON, XML) and see the complete target output with all mapped fields populated.

Output: A file-upload-driven preview workflow that parses sample source data, applies all mappings (direct passthrough + transformations), and displays the resulting target structure as formatted JSON.
</objective>

<execution_context>
@C:/Users/gary_/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/gary_/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mapper/components/PreviewPanel.tsx
@src/app/mapper/components/SampleDataInput.tsx
@src/app/mapper/components/PreviewResults.tsx
@src/app/mapper/page.tsx
@src/app/mapper/store/useMappingStore.ts
@src/app/api/transformations/preview/route.ts
@src/app/api/parse-schema/route.ts
@src/types/parser-types.ts
@src/types/mapping-types.ts
@src/transformations/pipeline.ts
@src/transformations/types.ts
@src/lib/parsers/json-sample-parser.ts
@src/lib/parsers/xml-sample-parser.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create sample data extractor and parse-sample-data API endpoint</name>
  <files>
    src/lib/sample-data-extractor.ts
    src/app/api/parse-sample-data/route.ts
  </files>
  <action>
**1. Create `src/lib/sample-data-extractor.ts`:**

This module provides two core utilities:

a) `flattenToPathMap(data: unknown, parentPath?: string): Record<string, unknown>` - Takes parsed JSON/XML data (the raw parsed object, NOT FieldNodes) and recursively flattens it into a map keyed by dot-notation paths that match the FieldNode path convention used in connections.

Rules for path generation (MUST match the path format used by the parsers in `src/lib/parsers/normalize.ts` - paths use dot notation like `payment.sender.name`):
- Object keys: `parent.child` (dot separated)
- Array items: `parent.items[].child` (bracket notation for array items, infer from first element)
- Root-level keys: just the key name
- For XML parsed with fast-xml-parser: attributes prefixed with `@_` should be mapped to `parent@attrName` paths (matching XmlSampleParser convention)
- Skip `#text` keys from XML parsing

Only leaf values (strings, numbers, booleans, null) go into the map. Objects and arrays are traversed, not stored.

b) `buildTargetOutput(connections: Array<{sourceFieldPath: string, targetFieldPath: string, transformation?: {type: string, config: Record<string, unknown>}}>, sourceValues: Record<string, unknown>, transformedValues?: Record<string, unknown>): Record<string, unknown>` - Takes the connections array, the flat source values map, and optionally a map of transformation outputs keyed by connection ID. Builds a nested target JSON object by:
- For each connection, resolve the source value from `sourceValues` using `sourceFieldPath`
- If the connection has a transformation and `transformedValues` has a result for it, use the transformed value
- Otherwise use the direct source value (passthrough)
- Set the value at the target path by splitting the `targetFieldPath` on dots and building nested objects. For example, `transfer.fromAccount.holderName` becomes `{ transfer: { fromAccount: { holderName: value } } }`
- Array paths (containing `[]`) should create arrays with a single element object

Export both functions.

**2. Create `src/app/api/parse-sample-data/route.ts`:**

A POST endpoint that accepts a file upload via FormData (same pattern as `/api/parse-schema/route.ts`), but instead of returning FieldNode schema trees, it returns the raw parsed data as a flat path-to-value map.

Implementation:
- Accept `file` from FormData (same 5MB limit as parse-schema)
- Detect format from file extension (`.json` -> JSON, `.xml` -> XML)
- For JSON: `JSON.parse(content)` then `flattenToPathMap(parsed)`
- For XML: Parse with `fast-xml-parser` using same config as XmlSampleParser (ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: false, parseTagValue: false, trimValues: true, removeNSPrefix: true), then `flattenToPathMap(parsed)`
- Return `{ success: true, values: Record<string, unknown>, fileName: string }`
- Return `{ error: string }` with status 400 on parse failure
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no TypeScript errors. Write a quick manual test: `curl -F "file=@sample-source-payment.json" http://localhost:3000/api/parse-sample-data` should return a JSON response with flattened paths like `{"success":true,"values":{"payment.transactionId":"TXN-12345","payment.amount":1500.50,...},"fileName":"sample-source-payment.json"}`.
  </verify>
  <done>
    - `flattenToPathMap` correctly flattens nested JSON/XML into dot-notation path keys matching FieldNode path convention
    - `buildTargetOutput` constructs nested target JSON from connections and source values
    - `/api/parse-sample-data` accepts file upload and returns flat value map
    - Both JSON and XML sample files parse correctly
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace textarea with file upload and wire full-mapping preview</name>
  <files>
    src/app/mapper/components/SampleDataInput.tsx
    src/app/mapper/components/PreviewPanel.tsx
    src/app/mapper/components/PreviewResults.tsx
    src/app/mapper/page.tsx
  </files>
  <action>
**1. Rewrite `src/app/mapper/components/SampleDataInput.tsx`:**

Replace the JSON textarea with a file upload control (similar style to SchemaUploadPanel but more compact since it sits in the bottom panel).

Props change to:
```typescript
interface SampleDataInputProps {
  onFileLoaded: (values: Record<string, unknown>, fileName: string) => void
  isLoading?: boolean
}
```

UI:
- A compact file upload area with a dashed border (reuse same visual pattern as SchemaUploadPanel but smaller/inline)
- Accept `.json` and `.xml` files: `accept=".json,.xml"`
- On file selection: POST to `/api/parse-sample-data` as FormData, call `onFileLoaded` with the returned values and fileName
- Show loading state while parsing
- Show loaded file name with a green checkmark after success
- Show error message in red if parsing fails
- Include a small "Clear" button to reset and allow re-upload

**2. Rewrite `src/app/mapper/components/PreviewPanel.tsx`:**

The preview workflow changes from "type JSON + run transformations only" to "upload file + run ALL mappings":

State:
- `sourceValues: Record<string, unknown> | null` (from file upload)
- `fileName: string | null`
- `previewResult: { targetOutput: Record<string, unknown>, ruleResults?: RuleResult[], errors?: string[] } | null`
- `isLoading: boolean`
- `error: string | null`

Props stay the same: `connections` and `sourceFields` from parent.

"Run Preview" logic:
1. Separate connections into two groups:
   - `connectionsWithTransformations`: those with a `.transformation` property
   - `directConnections`: those without `.transformation` (or with `transformation.type === 'direct'`)
2. If there are connections with non-direct transformations, POST to `/api/transformations/preview` to get transformed values (same as current behavior). Build a map of `connectionId -> transformedOutput` from the ruleResults.
3. Call `buildTargetOutput(connections, sourceValues, transformedValuesMap)` from `sample-data-extractor.ts` to build the complete target JSON. This function handles both direct and transformed connections.
4. Set `previewResult` with the full target output plus any rule results and errors from the transformation API.

The "Run Preview" button should be enabled when `sourceValues !== null && connections.length > 0`.

Remove the info message about "Add transformations to your mappings to preview results" since the preview now works for ALL connections including direct mappings.

**3. Update `src/app/mapper/components/PreviewResults.tsx`:**

Update to display the new result shape:
- Primary display: "Target Output" section showing the full target JSON in a formatted `<pre>` block (this is the main output the user cares about)
- Secondary: If there were transformation rule results, show them below in a collapsible "Transformation Details" section (keep existing rule-by-rule display but make it secondary)
- Add a "Copy JSON" button next to the Target Output header that copies the JSON to clipboard using `navigator.clipboard.writeText()`
- Keep existing error display for any transformation failures

Update the `PreviewResultsProps` interface to accept:
```typescript
interface PreviewResultsProps {
  targetOutput: Record<string, unknown> | null
  ruleResults?: RuleResult[]
  errors?: string[]
  isLoading: boolean
}
```

**4. Update `src/app/mapper/page.tsx`:**

The PreviewPanel props should also pass `targetSchema` so the preview can know the expected target structure. Update:
- Destructure `targetSchema` from `useMappingStore()`
- Pass `targetSchema={targetSchema}` as prop to PreviewPanel (in addition to existing `connections` and `sourceFields`)

The PreviewPanel can optionally use the target schema to scaffold the target output structure (filling in the target skeleton with mapped values).
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no TypeScript errors. Start the dev server with `npm run dev`. Navigate to http://localhost:3000/mapper. Upload source and target schemas, draw some mappings (both direct and with transformations). In the Preview panel, upload a sample source file (e.g., `sample-source-payment.json`). Click "Run Preview". Verify the target output JSON appears with all mapped fields populated from source values. Verify the "Copy JSON" button copies the output to clipboard.
  </verify>
  <done>
    - SampleDataInput shows file upload (not textarea) accepting JSON and XML files
    - PreviewPanel processes ALL connections (direct + transformed), not just transformed ones
    - Target output JSON displays in PreviewResults with all mapped source values populated
    - Copy JSON button works
    - Transformation rule details shown in secondary collapsible section
    - Error states handled for file parse failures and transformation errors
  </done>
</task>

</tasks>

<verification>
1. Upload source schema (e.g., sample-source-payment.json) and target schema (e.g., sample-target-transfer.json) to the mapper
2. Draw field connections between source and target fields (mix of direct and transformed)
3. In the Preview panel at the bottom, upload sample-source-payment.json as sample data
4. Click "Run Preview" and verify the target output JSON appears with correct values from the source file
5. Verify direct mappings show source values unchanged in target positions
6. Verify transformed mappings show transformed values in target positions
7. Click "Copy JSON" and paste to verify clipboard contains the output
8. Upload an XML file (sample-source-order.xml) as sample data and verify it also works
9. TypeScript compilation passes: `npx tsc --noEmit`
</verification>

<success_criteria>
- File upload replaces JSON textarea for sample data input
- ALL connections produce output (not just transformed ones)
- Target output JSON is correctly structured with nested paths
- Both JSON and XML sample files accepted
- Copy to clipboard works
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/7-the-validation-should-happen-by-uploadin/7-SUMMARY.md`
</output>
