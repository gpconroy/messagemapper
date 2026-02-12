import type { Connection, Node, Edge } from '@xyflow/react'
import type { FieldNode, FieldType } from '@/types/parser-types'
import type { MappingNodeData } from '@/types/mapping-types'

/**
 * Recursively searches for a field by path in a field tree
 */
function findFieldByPath(fields: FieldNode[], path: string): FieldNode | null {
  for (const field of fields) {
    if (field.path === path) {
      return field
    }
    if (field.children.length > 0) {
      const found = findFieldByPath(field.children, path)
      if (found) return found
    }
  }
  return null
}

/**
 * Checks if two field types are compatible for mapping
 *
 * Compatibility rules:
 * - Exact match is always valid
 * - integer can map to number (widening)
 * - any type can map to any (wildcard)
 * - any type can map from any (wildcard)
 * - number types (integer/number) are compatible with each other
 */
function areTypesCompatible(sourceType: FieldType, targetType: FieldType): boolean {
  // Exact match
  if (sourceType === targetType) return true

  // Any type wildcards
  if (sourceType === 'any' || targetType === 'any') return true

  // Integer to number is a safe widening conversion
  if (sourceType === 'integer' && targetType === 'number') return true

  // Number to integer is technically narrowing (loses decimals) but allow with transformation
  // Users can add a rounding transformation if needed
  if (sourceType === 'number' && targetType === 'integer') return true

  // All other combinations require explicit transformation
  return false
}

/**
 * Validates if a mapping connection is allowed between two handles
 */
export function isValidMappingConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[]
): boolean {
  // Prevent self-connections (shouldn't happen with two nodes, but safety check)
  if (connection.source === connection.target) {
    return false
  }

  // Prevent source-to-source or target-to-target connections
  // Only allow: source-node (source) -> target-node (target)
  if (
    !(connection.source === 'source-node' && connection.target === 'target-node')
  ) {
    return false
  }

  // Prevent duplicate mappings - check if edge with same handles already exists
  const duplicateExists = edges.some(
    (edge) =>
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
  )

  if (duplicateExists) {
    return false
  }

  // Type compatibility check
  const sourceNode = nodes.find(n => n.id === 'source-node') as Node<MappingNodeData> | undefined
  const targetNode = nodes.find(n => n.id === 'target-node') as Node<MappingNodeData> | undefined

  if (sourceNode && targetNode && connection.sourceHandle && connection.targetHandle) {
    const sourceField = findFieldByPath(sourceNode.data.fields, connection.sourceHandle)
    const targetField = findFieldByPath(targetNode.data.fields, connection.targetHandle)

    if (sourceField && targetField) {
      if (!areTypesCompatible(sourceField.type, targetField.type)) {
        console.warn(
          `Type mismatch: Cannot map ${sourceField.type} to ${targetField.type} without transformation`,
          { sourceField: connection.sourceHandle, targetField: connection.targetHandle }
        )
        return false
      }
    }
  }

  return true
}

/**
 * Creates a deterministic edge ID for a mapping connection
 */
export function createMappingEdgeId(
  sourceFieldPath: string,
  targetFieldPath: string
): string {
  return `mapping-${sourceFieldPath}--${targetFieldPath}`
}
