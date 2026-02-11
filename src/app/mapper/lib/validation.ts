import type { Connection, Node, Edge } from '@xyflow/react'

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
