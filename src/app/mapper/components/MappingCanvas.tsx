'use client'

import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMappingState } from '../hooks/useMappingState'
import { FieldTreeNode } from './FieldTreeNode'

// Define nodeTypes at module level to prevent React Flow warning about changing nodeTypes
const nodeTypes = { fieldTree: FieldTreeNode }

export function MappingCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgesDelete,
  } = useMappingState()

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
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
    </div>
  )
}
