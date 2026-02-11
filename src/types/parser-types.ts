/** Normalized field node — the universal output of all parsers */
export interface FieldNode {
  id: string          // Stable ID derived from path (for React keys)
  name: string        // Display name of this field
  path: string        // Dot-notation path: "root.parent.child" or "root.items[]"
  type: FieldType     // Normalized type
  required: boolean   // Whether field is required in schema (false for samples)
  children: FieldNode[]  // Nested fields
}

/** Canonical type set — all parsers normalize to these */
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'date' | 'null' | 'any'

/** Supported parser format types */
export type ParserType = 'json-schema' | 'json-sample' | 'xml-sample' | 'xsd'

/** Options passed to parsers */
export interface ParseOptions {
  strict?: boolean
  maxDepth?: number  // Prevent infinite recursion (default 50)
}

/** Validation result before parsing */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/** Full parse result including validation */
export interface ParserResult {
  success: boolean
  fieldNodes: FieldNode[]
  errors: string[]
  parserType: ParserType
}

/** Interface all parsers must implement */
export interface BaseParser {
  readonly format: ParserType
  parse(content: string, options?: ParseOptions): Promise<FieldNode[]>
  validate(content: string): Promise<ValidationResult>
}
