'use client'

import { ReactFlow, Background, Controls, type Node, type Edge, type OnNodesChange, type OnEdgesChange, type OnConnect, type OnEdgesDelete } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, createContext } from 'react'
import type { MappingNodeData } from '@/types/mapping-types'
import { FieldTreeNode } from './FieldTreeNode'
import { isValidMappingConnection } from '../lib/validation'

// Define nodeTypes at module level to prevent React Flow warning about changing nodeTypes
const nodeTypes = { fieldTree: FieldTreeNode }

// Context for providing mapped paths to field tree nodes
export const MappingStatusContext = createContext<{
  mappedSourcePaths: Set<string>
  mappedTargetPaths: Set<string>
}>({
  mappedSourcePaths: new Set(),
  mappedTargetPaths: new Set(),
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
}: MappingCanvasProps) {
  // Wrap validation function with current nodes and edges
  const isValidConnection = useCallback(
    (connection: any) => {
      return isValidMappingConnection(connection, nodes, edges)
    },
    [nodes, edges]
  )

  return (
    <div className="w-full h-full">
      <MappingStatusContext.Provider value={{ mappedSourcePaths, mappedTargetPaths }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
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
      </MappingStatusContext.Provider>
    </div>
  )
}
