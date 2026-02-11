'use client'

import { useCallback } from 'react'
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
import { MappingNodeData } from '@/types/mapping-types'

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

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds))
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
  }
}
