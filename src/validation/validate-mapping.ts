import type { FieldNode } from '@/types/parser-types'
import type { TransformationType } from '@/transformations/types'
import { areTypesCompatible, inferTransformationOutputType } from './type-compatibility'
import { validateRequiredFields } from './required-fields'

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
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  errorCount: number
  warningCount: number
}

/**
 * Connection format from useMappingStore
 */
interface MappingConnection {
  sourceFieldPath: string
  targetFieldPath: string
  transformation?: {
    type: TransformationType
    config?: Record<string, unknown>
  }
}

/**
 * Build a lookup map from field path to field node
 */
function buildFieldMap(fields: FieldNode[]): Map<string, FieldNode> {
  const map = new Map<string, FieldNode>()

  function traverse(field: FieldNode) {
    map.set(field.path, field)
    field.children.forEach(traverse)
  }

  fields.forEach(traverse)
  return map
}

/**
 * Validate a complete mapping configuration
 *
 * Combines required field validation and type compatibility checking.
 */
export function validateMapping(
  sourceSchema: FieldNode[],
  targetSchema: FieldNode[],
  connections: MappingConnection[]
): ValidationResult {
  const errors: ValidationError[] = []

  // Build field lookup maps for O(1) access
  const sourceFields = buildFieldMap(sourceSchema)
  const targetFields = buildFieldMap(targetSchema)

  // Build set of mapped target paths
  const mappedTargetPaths = new Set(connections.map(c => c.targetFieldPath))

  // 1. Check for unmapped required fields
  const requiredFieldErrors = validateRequiredFields(targetSchema, mappedTargetPaths)
  errors.push(...requiredFieldErrors)

  // 2. Check type compatibility for each connection
  for (const connection of connections) {
    const sourceField = sourceFields.get(connection.sourceFieldPath)
    const targetField = targetFields.get(connection.targetFieldPath)

    // Skip if fields not found (shouldn't happen with valid connections)
    if (!sourceField || !targetField) {
      continue
    }

    // Determine the actual output type after transformation
    let outputType = sourceField.type

    if (connection.transformation) {
      outputType = inferTransformationOutputType(
        sourceField.type,
        [connection.transformation]
      )
    }

    // Check if output type is compatible with target type
    if (!areTypesCompatible(outputType, targetField.type)) {
      errors.push({
        type: 'type_mismatch',
        sourceField: connection.sourceFieldPath,
        targetField: connection.targetFieldPath,
        message: `Type mismatch: Cannot map ${outputType} to ${targetField.type}`,
        severity: 'error'
      })
    }
  }

  // Calculate counts
  const errorCount = errors.filter(e => e.severity === 'error').length
  const warningCount = errors.filter(e => e.severity === 'warning').length

  return {
    valid: errors.length === 0,
    errors,
    errorCount,
    warningCount
  }
}
