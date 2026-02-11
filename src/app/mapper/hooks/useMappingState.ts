'use client'

import { useCallback, useMemo } from 'react'
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
  type OnEdgesDelete,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import { FieldNode } from '@/types/parser-types'
import { MappingNodeData, MappingEdgeData, FieldMappingStatus, MappingSide } from '@/types/mapping-types'
import { createMappingEdgeId } from '../lib/validation'

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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MappingNodeData>>([] as Node<MappingNodeData>[])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[])

  const setSourceSchema = useCallback(
    (fields: FieldNode[], label: string) => {
      const newNode: Node<MappingNodeData> = {
        id: 'source-node',
        type: 'fieldTree',
        position: { x: 0, y: 0 },
        data: {
          side: 'source',
          label,
          fields,
          expanded: {},
        },
        draggable: false,
      }

      setNodes((nds) => {
        const existing = nds.find((n) => n.id === 'source-node')
        if (existing) {
          return nds.map((n) => (n.id === 'source-node' ? newNode : n))
        }
        return [...nds, newNode]
      })
    },
    [setNodes]
  )

  const setTargetSchema = useCallback(
    (fields: FieldNode[], label: string) => {
      const newNode: Node<MappingNodeData> = {
        id: 'target-node',
        type: 'fieldTree',
        position: { x: 600, y: 0 },
        data: {
          side: 'target',
          label,
          fields,
          expanded: {},
        },
        draggable: false,
      }

      setNodes((nds) => {
        const existing = nds.find((n) => n.id === 'target-node')
        if (existing) {
          return nds.map((n) => (n.id === 'target-node' ? newNode : n))
        }
        return [...nds, newNode]
      })
    },
    [setNodes]
  )

  // Derive mapped paths from edges
  const mappedSourcePaths = useMemo(() => {
    const paths = new Set<string>()
    edges.forEach((edge) => {
      if (edge.sourceHandle) {
        paths.add(edge.sourceHandle)
      }
    })
    return paths
  }, [edges])

  const mappedTargetPaths = useMemo(() => {
    const paths = new Set<string>()
    edges.forEach((edge) => {
      if (edge.targetHandle) {
        paths.add(edge.targetHandle)
      }
    })
    return paths
  }, [edges])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return

      const newEdge: Edge<MappingEdgeData> = {
        id: createMappingEdgeId(connection.sourceHandle, connection.targetHandle),
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 },
        data: {
          sourceFieldPath: connection.sourceHandle,
          targetFieldPath: connection.targetHandle,
        },
      }

      setEdges((eds) => [...eds, newEdge])
    },
    [setEdges]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (edgesToDelete) => {
      setEdges((eds) => eds.filter((e) => !edgesToDelete.find((de) => de.id === e.id)))
    },
    [setEdges]
  )

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setSourceSchema,
    setTargetSchema,
    onConnect,
    onEdgesDelete,
    mappedSourcePaths,
    mappedTargetPaths,
  }
}
