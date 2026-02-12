'use client'

import { ReactFlow, Background, Controls, ConnectionLineType, type Node, type Edge, type OnNodesChange, type OnEdgesChange, type OnConnect, type OnEdgesDelete } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, createContext } from 'react'
import type { MappingNodeData } from '@/types/mapping-types'
import { FieldTreeNode } from './FieldTreeNode'
import { TransformationEdge } from './TransformationEdge'
import { isValidMappingConnection } from '../lib/validation'
import { TransformationDialog } from './TransformationDialog'
import { useMappingStore } from '../store/useMappingStore'

// Define nodeTypes and edgeTypes at module level to prevent React Flow warning about changing types
const nodeTypes = { fieldTree: FieldTreeNode }
const edgeTypes = { transformation: TransformationEdge }

// Context for providing mapped paths and validation errors to field tree nodes
export const MappingStatusContext = createContext<{
  mappedSourcePaths: Set<string>
  mappedTargetPaths: Set<string>
  validationErrors: Map<string, Array<{ type: string; message: string; severity: string }>>
}>({
  mappedSourcePaths: new Set(),
  mappedTargetPaths: new Set(),
  validationErrors: new Map(),
})

interface MappingCanvasProps {
  nodes: Node<MappingNodeData>[]
  edges: Edge[]
  onNodesChange: OnNodesChange<Node<MappingNodeData>>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onEdgesDelete: OnEdgesDelete
  mappedSourcePaths: Set<string>
  mappedTargetPaths: Set<string>
  validationErrors?: Map<string, Array<{ type: string; message: string; severity: string }>>
}

export function MappingCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgesDelete,
  mappedSourcePaths,
  mappedTargetPaths,
  validationErrors = new Map(),
}: MappingCanvasProps) {
  const setSelectedConnectionId = useMappingStore((state) => state.setSelectedConnectionId)

  // Wrap validation function with current nodes and edges
  const isValidConnection = useCallback(
    (connection: any) => {
      return isValidMappingConnection(connection, nodes, edges)
    },
    [nodes, edges]
  )

  // Handle edge click to open transformation dialog
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedConnectionId(edge.id)
    },
    [setSelectedConnectionId]
  )

  return (
    <div className="w-full h-full">
      <MappingStatusContext.Provider value={{ mappedSourcePaths, mappedTargetPaths, validationErrors }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          isValidConnection={isValidConnection}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#2563eb', strokeWidth: 2 },
          }}
          deleteKeyCode="Backspace"
          fitView
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <TransformationDialog />
      </MappingStatusContext.Provider>
    </div>
  )
}
