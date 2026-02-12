import type { Connection, Node, Edge } from '@xyflow/react'
import type { FieldNode } from '@/types/parser-types'
import type { MappingNodeData } from '@/types/mapping-types'
import { areTypesCompatible } from '@/validation/type-compatibility'

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

function normalizeConnectionHandles(connection: Connection): {
  sourceHandle: string
  targetHandle: string
} | null {
  if (!connection.sourceHandle || !connection.targetHandle) {
    return null
  }

  // Standard direction: source-node -> target-node
  if (connection.source === 'source-node' && connection.target === 'target-node') {
    return {
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    }
  }

  // Loose mode can produce reverse direction when dragging from target to source.
  if (connection.source === 'target-node' && connection.target === 'source-node') {
    return {
      sourceHandle: connection.targetHandle,
      targetHandle: connection.sourceHandle,
    }
  }

  return null
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

  const normalizedHandles = normalizeConnectionHandles(connection)
  if (!normalizedHandles) {
    return false
  }

  // Prevent duplicate mappings - check if edge with same handles already exists
  const duplicateExists = edges.some(
    (edge) =>
      edge.sourceHandle === normalizedHandles.sourceHandle &&
      edge.targetHandle === normalizedHandles.targetHandle
  )

  if (duplicateExists) {
    return false
  }

  // Type compatibility check
  const sourceNode = nodes.find(n => n.id === 'source-node') as Node<MappingNodeData> | undefined
  const targetNode = nodes.find(n => n.id === 'target-node') as Node<MappingNodeData> | undefined

  if (sourceNode && targetNode) {
    const sourceField = findFieldByPath(sourceNode.data.fields, normalizedHandles.sourceHandle)
    const targetField = findFieldByPath(targetNode.data.fields, normalizedHandles.targetHandle)

    if (sourceField && targetField) {
      if (!areTypesCompatible(sourceField.type, targetField.type)) {
        console.warn(
          `Type mismatch: Cannot map ${sourceField.type} to ${targetField.type} without transformation`,
          { sourceField: normalizedHandles.sourceHandle, targetField: normalizedHandles.targetHandle }
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
