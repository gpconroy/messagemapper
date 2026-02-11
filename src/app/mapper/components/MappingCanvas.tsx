'use client'

import { useMemo } from 'react'
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMappingState } from '../hooks/useMappingState'
import { MappingNodeData } from '@/types/mapping-types'

// Placeholder FieldTreeNode component - will be replaced in Plan 02 with full tree
function FieldTreeNode({ data }: { data: MappingNodeData }) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4 min-w-[200px]">
      <Handle type="target" position={Position.Left} />
      <div className="font-semibold text-gray-800">{data.label}</div>
      <div className="text-sm text-gray-600 mt-1">
        {data.fields.length} field{data.fields.length !== 1 ? 's' : ''}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export function MappingCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgesDelete,
  } = useMappingState()

  const nodeTypes = useMemo(() => ({ fieldTree: FieldTreeNode }), [])

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
        deleteKeyCode="Backspace"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
