'use client'

import { useCallback, useMemo, useEffect } from 'react'
import {
  useNodesState,
  type Node,
  type Edge,
  type OnConnect,
  type OnEdgesDelete,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import { FieldNode } from '@/types/parser-types'
import { MappingNodeData, MappingEdgeData, FieldMappingStatus } from '@/types/mapping-types'
import { useMappingStore } from '../store/useMappingStore'
import { TransformationType } from '@/transformations/types'

/**
 * Recursively collects all leaf field paths from a field tree
 */
function getLeafPaths(field: FieldNode): string[] {
  if (field.children.length === 0) {
    return [field.path]
  }
  return field.children.flatMap(getLeafPaths)
}

/**
 * Get transformation type abbreviation for edge labels
 */
function getTransformationAbbreviation(type: TransformationType): string {
  switch (type) {
    case 'format_date':
      return 'Dt'
    case 'format_number':
      return '#'
    case 'split':
      return 'Split'
    case 'concatenate':
      return 'Join'
    case 'conditional':
      return 'If'
    case 'constant':
      return '='
    case 'lookup':
      return 'Lkp'
    case 'custom_js':
      return 'JS'
    default:
      return '?'
  }
}

/**
 * Computes the mapping status for a field based on its descendants
 */
export function getMappingStatus(
  field: FieldNode,
  mappedPaths: Set<string>
): FieldMappingStatus {
  const leafPaths = getLeafPaths(field)

  if (leafPaths.length === 0) {
    // No leaves (shouldn't happen, but safety check)
    return 'unmapped'
  }

  const mappedCount = leafPaths.filter((path) => mappedPaths.has(path)).length

  if (mappedCount === 0) {
    return 'unmapped'
  } else if (mappedCount === leafPaths.length) {
    return 'mapped'
  } else {
    return 'partial'
  }
}

export function useMappingState() {
  const store = useMappingStore()
  const { sourceSchema, targetSchema, connections } = store

  // Build nodes from schemas
  const schemaNodes = useMemo(() => {
    const result: Node<MappingNodeData>[] = []
    if (sourceSchema) {
      result.push({
        id: 'source-node',
        type: 'fieldTree',
        position: { x: 0, y: 0 },
        data: {
          side: 'source',
          label: sourceSchema.label,
          fields: sourceSchema.fields,
          expanded: {},
        },
        draggable: false,
      })
    }
    if (targetSchema) {
      result.push({
        id: 'target-node',
        type: 'fieldTree',
        position: { x: 600, y: 0 },
        data: {
          side: 'target',
          label: targetSchema.label,
          fields: targetSchema.fields,
          expanded: {},
        },
        draggable: false,
      })
    }
    return result
  }, [sourceSchema, targetSchema])

  // Use React Flow's nodes state for UI-level changes (position, selection)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MappingNodeData>>(schemaNodes)

  // Sync schema changes to React Flow nodes
  useEffect(() => {
    setNodes(schemaNodes)
  }, [schemaNodes, setNodes])

  // Build edges from connections
  const edges: Edge[] = useMemo(
    () =>
      connections.map((conn) => {
        const hasTransformation = !!conn.transformation
        return {
          id: conn.id,
          source: 'source-node',
          target: 'target-node',
          sourceHandle: conn.sourceFieldPath,
          targetHandle: conn.targetFieldPath,
          type: 'smoothstep',
          animated: true,
          style: hasTransformation
            ? { stroke: '#7c3aed', strokeWidth: 2 } // Purple for transformed edges
            : { stroke: '#2563eb', strokeWidth: 2 }, // Blue for plain edges
          label: hasTransformation && conn.transformation ? getTransformationAbbreviation(conn.transformation.type) : undefined,
          labelStyle: hasTransformation
            ? {
                fill: '#4c1d95',
                fontWeight: 600,
                fontSize: 10,
              }
            : undefined,
          labelBgStyle: hasTransformation
            ? {
                fill: '#ddd6fe',
                fillOpacity: 0.9,
              }
            : undefined,
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4,
          data: {
            sourceFieldPath: conn.sourceFieldPath,
            targetFieldPath: conn.targetFieldPath,
          },
        }
      }),
    [connections]
  )

  // Derive mapped paths from connections
  const mappedSourcePaths = useMemo(
    () => new Set(connections.map((c) => c.sourceFieldPath)),
    [connections]
  )
  const mappedTargetPaths = useMemo(
    () => new Set(connections.map((c) => c.targetFieldPath)),
    [connections]
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return
      store.addConnection(connection.sourceHandle, connection.targetHandle)
    },
    [store]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (edgesToDelete) => {
      store.removeConnections(edgesToDelete.map((e) => e.id))
    },
    [store]
  )

  // Edges don't need onEdgesChange since they're derived from store
  // But React Flow expects it - provide a no-op
  const onEdgesChange: OnEdgesChange = useCallback(() => {}, [])

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setSourceSchema: store.setSourceSchema,
    setTargetSchema: store.setTargetSchema,
    onConnect,
    onEdgesDelete,
    mappedSourcePaths,
    mappedTargetPaths,
  }
}
