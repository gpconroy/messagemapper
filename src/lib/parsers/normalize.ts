import type { FieldType } from '@/types/parser-types'

/**
 * Maps schema-specific types to canonical FieldType.
 * Handles JSON Schema types, XSD types, and inferred types from samples.
 */
export function normalizeType(rawType: string | string[] | undefined): FieldType {
  // Handle undefined/null
  if (!rawType) {
    return 'any'
  }

  // Handle array of types (JSON Schema allows ["string", "null"])
  if (Array.isArray(rawType)) {
    // Pick first non-null type
    const nonNullType = rawType.find(t => t !== 'null')
    return nonNullType ? normalizeType(nonNullType) : 'null'
  }

  const type = rawType.toLowerCase()

  // JSON Schema types
  if (type === 'string') return 'string'
  if (type === 'number') return 'number'
  if (type === 'integer') return 'integer'
  if (type === 'boolean') return 'boolean'
  if (type === 'object') return 'object'
  if (type === 'array') return 'array'
  if (type === 'null') return 'null'

  // XSD types
  if (type === 'xs:string' || type.endsWith(':string')) return 'string'
  if (type === 'xs:int' || type === 'xs:integer' || type === 'xs:long' || type === 'xs:short' || type.endsWith(':int') || type.endsWith(':integer')) return 'integer'
  if (type === 'xs:decimal' || type === 'xs:float' || type === 'xs:double' || type.endsWith(':decimal') || type.endsWith(':float') || type.endsWith(':double')) return 'number'
  if (type === 'xs:boolean' || type.endsWith(':boolean')) return 'boolean'
  if (type === 'xs:date' || type === 'xs:datetime' || type.endsWith(':date') || type.endsWith(':datetime')) return 'date'

  // Default to any for unknown types
  return 'any'
}

/**
 * Produces canonical dot-notation paths.
 * Examples: "parent.child", "parent.items[]"
 */
export function generatePath(parentPath: string, name: string, isArrayItem?: boolean): string {
  const suffix = isArrayItem ? '[]' : ''

  // Root level — no prefix
  if (!parentPath || parentPath === '') {
    return name + suffix
  }

  return `${parentPath}.${name}${suffix}`
}

/**
 * Converts path to stable ID for React keys.
 * Example: "root.items[].name" → "root-items-array-name"
 */
export function generateId(path: string): string {
  return path
    .replace(/\./g, '-')
    .replace(/\[\]/g, '-array')
}
