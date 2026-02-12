'use client'

import { useCallback, useMemo, useEffect } from 'react'
import {
  useNodesState,
  applyEdgeChanges,
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
        width: 288, // w-72 equivalent (18rem = 288px)
        height: 500,
      })
    }
    if (targetSchema) {
      result.push({
        id: 'target-node',
        type: 'fieldTree',
        position: { x: 700, y: 0 }, // More room for wider source nodes
        data: {
          side: 'target',
          label: targetSchema.label,
          fields: targetSchema.fields,
          expanded: {},
        },
        draggable: false,
        width: 288,
        height: 500,
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
          type: hasTransformation ? 'transformation' : 'smoothstep',
          animated: true,
          style: hasTransformation
            ? { stroke: '#7c3aed', strokeWidth: 2 } // Purple for transformed edges
            : { stroke: '#2563eb', strokeWidth: 2 }, // Blue for plain edges
          data: {
            sourceFieldPath: conn.sourceFieldPath,
            targetFieldPath: conn.targetFieldPath,
            transformationType: conn.transformation?.type,
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

  // Handle edge changes - process removals through the store, ignore position updates
  // (edges are derived from store.connections, so we only need to handle delete events)
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const removals = changes.filter((change) => change.type === 'remove')
      if (removals.length > 0) {
        const idsToRemove = removals.map((r) => r.id)
        store.removeConnections(idsToRemove)
      }
    },
    [store]
  )

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
