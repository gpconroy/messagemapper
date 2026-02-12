'use client'

import React, { useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import { FieldNode } from '@/types/parser-types'
import { MappingSide, FieldMappingStatus } from '@/types/mapping-types'
import { MappingStatusContext } from './MappingCanvas'
import { getMappingStatus } from '../hooks/useMappingState'

interface FieldTreeItemProps {
  field: FieldNode
  depth: number
  side: MappingSide
  isExpanded: (path: string) => boolean
  onToggle: (path: string) => void
  mappingStatus?: FieldMappingStatus
  searchTerm?: string
  validationErrors?: Map<string, Array<{ type: string; message: string; severity: string }>>
}

// Color mapping for different field types
const typeColorMap: Record<string, string> = {
  string: 'bg-blue-100 text-blue-700',
  number: 'bg-purple-100 text-purple-700',
  integer: 'bg-purple-100 text-purple-700',
  boolean: 'bg-amber-100 text-amber-700',
  date: 'bg-teal-100 text-teal-700',
  object: 'bg-gray-100 text-gray-600',
  array: 'bg-indigo-100 text-indigo-700',
  null: 'bg-gray-100 text-gray-500',
  any: 'bg-gray-100 text-gray-500',
}

function FieldTreeItemComponent({
  field,
  depth,
  side,
  isExpanded,
  onToggle,
  mappingStatus,
  searchTerm,
  validationErrors,
}: FieldTreeItemProps) {
  const hasChildren = field.children.length > 0
  const expanded = isExpanded(field.path)
  const showHandle = !hasChildren || !expanded

  // Get mapped paths from context to compute status for children
  const { mappedSourcePaths, mappedTargetPaths } = useContext(MappingStatusContext)
  const mappedPaths = side === 'source' ? mappedSourcePaths : mappedTargetPaths

  // Status indicator colors
  const statusIndicator =
    mappingStatus === 'mapped'
      ? 'bg-green-500'
      : mappingStatus === 'partial'
      ? 'bg-amber-400'
      : 'bg-gray-300'


  // Get type color from mapping (fallback to gray)
  const typeColor = typeColorMap[field.type] || 'bg-gray-100 text-gray-600'

  // Required field border styling
  const requiredBorder = field.required ? 'border-l-2 border-l-red-300' : 'border-l-2 border-l-transparent'

  // Get validation errors for this field
  const fieldValidationErrors = validationErrors?.get(field.path) || []
  const hasError = fieldValidationErrors.some(e => e.severity === 'error')
  const hasWarning = fieldValidationErrors.some(e => e.severity === 'warning')
  const errorMessage = fieldValidationErrors.map(e => e.message).join('; ')

  // Highlight search matches in field name
  const highlightedName = React.useMemo(() => {
    if (!searchTerm || !field.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return field.name
    }
    const lowerName = field.name.toLowerCase()
    const lowerTerm = searchTerm.toLowerCase()
    const startIdx = lowerName.indexOf(lowerTerm)
    const endIdx = startIdx + searchTerm.length
    return (
      <>
        {field.name.substring(0, startIdx)}
        <mark className="bg-yellow-200 rounded">{field.name.substring(startIdx, endIdx)}</mark>
        {field.name.substring(endIdx)}
      </>
    )
  }, [field.name, searchTerm])

  return (
    <div>
      {/* Field row */}
      <div
        className={`relative flex items-center border-b border-gray-100 hover:bg-blue-50 py-1.5 px-2 group ${requiredBorder}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        title={field.required ? 'Required field' : 'Optional field'}
      >
        {/* Mapping status indicator dot */}
        <div
          className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${statusIndicator}`}
          title={
            mappingStatus === 'mapped'
              ? 'Fully mapped'
              : mappingStatus === 'partial'
              ? 'Partially mapped'
              : 'Unmapped'
          }
        />

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
        <span className="font-medium text-sm text-gray-800 flex-1 min-w-0 truncate flex items-center gap-1.5">
          <span className="truncate">
            {highlightedName}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          {/* Validation error indicator */}
          {(hasError || hasWarning) && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                hasError ? 'bg-red-500' : 'bg-yellow-500'
              }`}
              title={errorMessage}
            />
          )}
        </span>

        {/* Type badge with color coding */}
        <span className={`text-xs px-1.5 py-0.5 rounded ml-2 flex-shrink-0 ${typeColor}`}>
          {field.type}
        </span>

        {/* Connection handle */}
        {showHandle && (
          <Handle
            type={side === 'source' ? 'source' : 'target'}
            position={side === 'source' ? Position.Right : Position.Left}
            id={field.path}
            style={{
              width: 12,
              height: 12,
              border: '2px solid',
              borderRadius: '50%',
              background: mappingStatus === 'mapped' ? '#22c55e' : side === 'source' ? '#2563eb' : '#22c55e',
              borderColor: mappingStatus === 'mapped' ? '#16a34a' : side === 'source' ? '#1e40af' : '#16a34a',
              zIndex: 50,
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              ...(side === 'source'
                ? { right: -6 }
                : { left: -6 }),
              cursor: 'crosshair',
              pointerEvents: 'auto' as const,
            }}
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
              mappingStatus={getMappingStatus(child, mappedPaths)}
              searchTerm={searchTerm}
              validationErrors={validationErrors}
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
