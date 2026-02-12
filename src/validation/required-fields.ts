import type { FieldNode } from '@/types/parser-types'

/**
 * Validation error structure
 */
export interface ValidationError {
  type: 'missing_required' | 'type_mismatch'
  targetField: string
  sourceField?: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Recursively flatten field tree to get all leaf fields
 *
 * Only leaf fields (fields with no children) are considered mappable endpoints.
 * Parent object/array nodes are structural containers.
 */
export function flattenFields(fields: FieldNode[]): FieldNode[] {
  const result: FieldNode[] = []

  function traverse(field: FieldNode) {
    // If field has children, it's a container - traverse children
    if (field.children.length > 0) {
      field.children.forEach(traverse)
    } else {
      // Leaf field - add to result
      result.push(field)
    }
  }

  fields.forEach(traverse)
  return result
}

/**
 * Validate that all required target fields have mappings
 *
 * Returns array of validation errors for unmapped required fields.
 */
export function validateRequiredFields(
  targetSchema: FieldNode[],
  mappedTargetPaths: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = []

  // Flatten to get only leaf fields
  const leafFields = flattenFields(targetSchema)

  // Check each required leaf field
  for (const field of leafFields) {
    if (field.required && !mappedTargetPaths.has(field.path)) {
      errors.push({
        type: 'missing_required',
        targetField: field.path,
        message: `Required field "${field.path}" is not mapped`,
        severity: 'error'
      })
    }
  }

  return errors
}
