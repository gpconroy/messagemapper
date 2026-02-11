'use client'

import React from 'react'
import type { Node } from '@xyflow/react'
import { MappingNodeData } from '@/types/mapping-types'
import { FieldTreeItem } from './FieldTreeItem'
import { useFieldTree } from '../hooks/useFieldTree'

interface FieldTreeNodeProps {
  id: string
  data: MappingNodeData
}

function FieldTreeNodeComponent({ id, data }: FieldTreeNodeProps) {
  const { isExpanded, toggleExpand, expandAll, collapseAll } = useFieldTree(id)

  const handleExpandAll = () => {
    expandAll(data.fields)
  }

  const handleCollapseAll = () => {
    collapseAll()
  }

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className={`px-4 py-2 flex items-center justify-between ${
          data.side === 'source' ? 'bg-blue-50' : 'bg-green-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">{data.label}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              data.side === 'source'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {data.side === 'source' ? 'Source' : 'Target'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 hover:bg-white rounded"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 hover:bg-white rounded"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Field list - scrollable with nowheel/nopan to prevent React Flow interference */}
      <div className="w-72 max-h-[70vh] overflow-y-auto nowheel nopan">
        {data.fields.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No fields loaded
          </div>
        ) : (
          <div>
            {data.fields.map((field) => (
              <FieldTreeItem
                key={field.id}
                field={field}
                depth={0}
                side={data.side}
                isExpanded={isExpanded}
                onToggle={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize for performance - React Flow re-renders nodes frequently
export const FieldTreeNode = React.memo(FieldTreeNodeComponent)
FieldTreeNode.displayName = 'FieldTreeNode'
