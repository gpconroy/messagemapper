'use client'

import React, { useContext, useState } from 'react'
import type { Node } from '@xyflow/react'
import { NodeResizer } from '@xyflow/react'
import { MappingNodeData } from '@/types/mapping-types'
import { FieldTreeItem } from './FieldTreeItem'
import { useFieldTree } from '../hooks/useFieldTree'
import { MappingStatusContext } from './MappingCanvas'
import { getMappingStatus } from '../hooks/useMappingState'
import { SearchInput } from './SearchInput'
import { useDebounce } from '../hooks/useDebounce'
import { FieldNode } from '@/types/parser-types'

interface FieldTreeNodeProps {
  id: string
  data: MappingNodeData
}

/**
 * Filter fields recursively based on search term.
 * If a parent matches, all children are shown.
 * If a child matches, the parent chain is shown.
 */
function filterFields(fields: FieldNode[], term: string): FieldNode[] {
  if (!term) return fields
  const lower = term.toLowerCase()

  function matches(field: FieldNode): boolean {
    if (field.name.toLowerCase().includes(lower)) return true
    return field.children.some(matches)
  }

  function filter(nodes: FieldNode[]): FieldNode[] {
    return nodes
      .filter(matches)
      .map(node => ({
        ...node,
        children: node.name.toLowerCase().includes(lower)
          ? node.children  // Parent matches: show all children
          : filter(node.children)  // Only matching children
      }))
  }

  return filter(fields)
}

function FieldTreeNodeComponent({ id, data }: FieldTreeNodeProps) {
  const { isExpanded, toggleExpand, expandAll, collapseAll } = useFieldTree(id)
  const { mappedSourcePaths, mappedTargetPaths, validationErrors } = useContext(MappingStatusContext)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Get the appropriate mapped paths set for this side
  const mappedPaths = data.side === 'source' ? mappedSourcePaths : mappedTargetPaths

  // Filter fields based on debounced search term
  const filteredFields = filterFields(data.fields, debouncedSearch)

  // When search is active with results, auto-expand all filtered paths
  React.useEffect(() => {
    if (debouncedSearch && filteredFields.length > 0) {
      expandAll(filteredFields)
    }
  }, [debouncedSearch, filteredFields])

  const handleExpandAll = () => {
    expandAll(debouncedSearch ? filteredFields : data.fields)
  }

  const handleCollapseAll = () => {
    collapseAll()
  }

  return (
    <div className="w-full h-full bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden flex flex-col">
      <NodeResizer
        minWidth={200}
        minHeight={200}
        maxWidth={800}
        maxHeight={900}
        color={data.side === 'source' ? '#3b82f6' : '#22c55e'}
        handleStyle={{ width: 8, height: 8 }}
      />

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

      {/* Search input */}
      <div className="px-3 py-2 border-b border-gray-200">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search fields..."
          side={data.side}
        />
      </div>

      {/* Field list - scrollable with nowheel/nopan to prevent React Flow interference */}
      <div className="flex-1 overflow-y-auto min-h-0 nowheel nopan">
        {data.fields.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No fields loaded
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No fields match &quot;{debouncedSearch}&quot;
          </div>
        ) : (
          <div>
            {filteredFields.map((field) => (
              <FieldTreeItem
                key={field.id}
                field={field}
                depth={0}
                side={data.side}
                isExpanded={isExpanded}
                onToggle={toggleExpand}
                mappingStatus={getMappingStatus(field, mappedPaths)}
                searchTerm={debouncedSearch}
                validationErrors={validationErrors}
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
