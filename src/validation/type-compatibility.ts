import type { FieldType } from '@/types/parser-types'
import type { TransformationType } from '@/transformations/types'

/**
 * Type Compatibility Matrix
 *
 * Defines which source types can be safely mapped to which target types.
 * This is more comprehensive than the simple areTypesCompatible in validation.ts,
 * as it considers string parsing capabilities and type coercion scenarios.
 */
export const TYPE_COMPATIBILITY: Record<FieldType, FieldType[]> = {
  // String is most flexible source - can parse to most types
  string: ['string', 'number', 'integer', 'boolean', 'date', 'any'],

  // Number types can convert between each other and to string
  number: ['number', 'integer', 'string', 'any'],
  integer: ['integer', 'number', 'string', 'any'],

  // Boolean can convert to string and number representations
  boolean: ['boolean', 'string', 'number', 'integer', 'any'],

  // Date can convert to string (ISO) or number (timestamp)
  date: ['date', 'string', 'number', 'any'],

  // Object can only stringify or remain object
  object: ['object', 'string', 'any'],

  // Array can only stringify or remain array
  array: ['array', 'string', 'any'],

  // Null can only go to any (null is not a valid value for other types)
  null: ['any'],

  // Any is compatible with everything
  any: ['string', 'number', 'integer', 'boolean', 'date', 'object', 'array', 'null', 'any']
}

/**
 * Check if two types are compatible for direct mapping
 */
export function areTypesCompatible(sourceType: FieldType, targetType: FieldType): boolean {
  return TYPE_COMPATIBILITY[sourceType]?.includes(targetType) ?? false
}

/**
 * Helper to infer FieldType from a constant value
 */
export function inferTypeFromValue(value: unknown): FieldType {
  if (value === null) return 'null'
  if (value === undefined) return 'any'

  const jsType = typeof value
  if (jsType === 'string') return 'string'
  if (jsType === 'boolean') return 'boolean'
  if (jsType === 'number') return 'number'

  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (jsType === 'object') return 'object'

  return 'any'
}

/**
 * Transformation Output Type Rules
 *
 * Maps transformation types to their output types.
 * Some transformations produce fixed output types, others depend on input or config.
 */
const TRANSFORMATION_OUTPUT_TYPES: Record<
  TransformationType,
  FieldType | ((inputType: FieldType, config?: Record<string, unknown>) => FieldType)
> = {
  direct: (inputType) => inputType, // Pass through
  format_date: 'string', // Always outputs formatted string
  format_number: 'string', // Always outputs formatted string
  split: 'array', // Splits string into array
  concatenate: 'string', // Joins array/multiple values into string
  conditional: 'any', // Can return either thenValue or elseValue (type unknown)
  lookup: 'string', // Lookup table returns string values
  constant: (_inputType, config) => {
    // Infer type from constant value
    const value = config?.value
    return inferTypeFromValue(value)
  },
  custom_js: 'any' // Custom code can return anything
}

/**
 * Infer the final output type after applying a transformation chain
 *
 * Traces through transformations sequentially to determine final type.
 */
export function inferTransformationOutputType(
  inputType: FieldType,
  transformations: Array<{ type: string; config?: Record<string, unknown> }>
): FieldType {
  if (transformations.length === 0) {
    return inputType
  }

  let currentType = inputType

  for (const transformation of transformations) {
    const outputRule = TRANSFORMATION_OUTPUT_TYPES[transformation.type as TransformationType]

    if (outputRule === undefined) {
      // Unknown transformation type - assume any
      currentType = 'any'
      continue
    }

    if (typeof outputRule === 'function') {
      currentType = outputRule(currentType, transformation.config)
    } else {
      currentType = outputRule
    }
  }

  return currentType
}
