'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { FieldNode } from '@/types/parser-types'
import { MappingSide, FieldMappingStatus } from '@/types/mapping-types'

interface FieldTreeItemProps {
  field: FieldNode
  depth: number
  side: MappingSide
  isExpanded: (path: string) => boolean
  onToggle: (path: string) => void
  mappingStatus?: FieldMappingStatus
}

function FieldTreeItemComponent({
  field,
  depth,
  side,
  isExpanded,
  onToggle,
  mappingStatus,
}: FieldTreeItemProps) {
  const hasChildren = field.children.length > 0
  const expanded = isExpanded(field.path)
  const showHandle = !hasChildren || !expanded

  return (
    <div>
      {/* Field row */}
      <div
        className="relative flex items-center border-b border-gray-100 hover:bg-blue-50 py-1.5 px-2 group"
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren && (
          <button
            onClick={() => onToggle(field.path)}
            className="mr-1.5 text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <span className="text-xs">
              {expanded ? '\u25BC' : '\u25B6'}
            </span>
          </button>
        )}

        {/* Spacer if no children */}
        {!hasChildren && <span className="w-4 mr-1.5" />}

        {/* Field name */}
        <span className="font-medium text-sm text-gray-800 flex-1 min-w-0 truncate">
          {field.name}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>

        {/* Type badge */}
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 ml-2 flex-shrink-0">
          {field.type}
        </span>

        {/* Connection handle */}
        {showHandle && (
          <Handle
            type={side === 'source' ? 'source' : 'target'}
            position={side === 'source' ? Position.Right : Position.Left}
            id={field.path}
            className={`!w-3 !h-3 !border-2 ${
              side === 'source'
                ? '!right-0 !bg-blue-500 !border-blue-600'
                : '!left-0 !bg-green-500 !border-green-600'
            }`}
          />
        )}
      </div>

      {/* Render children recursively if expanded */}
      {expanded && hasChildren && (
        <div>
          {field.children.map((child) => (
            <FieldTreeItemComponent
              key={child.id}
              field={child}
              depth={depth + 1}
              side={side}
              isExpanded={isExpanded}
              onToggle={onToggle}
              mappingStatus={mappingStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const FieldTreeItem = React.memo(FieldTreeItemComponent)
FieldTreeItem.displayName = 'FieldTreeItem'
