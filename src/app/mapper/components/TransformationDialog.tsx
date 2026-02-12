'use client'

import { useEffect, useState } from 'react'
import { TransformationType } from '@/transformations/types'
import { useMappingStore } from '../store/useMappingStore'
import { DateFormatForm } from './config-forms/DateFormatForm'
import { NumberFormatForm } from './config-forms/NumberFormatForm'
import { StringOpForm } from './config-forms/StringOpForm'
import { ConditionalForm } from './config-forms/ConditionalForm'
import { ConstantForm } from './config-forms/ConstantForm'
import { LookupForm } from './config-forms/LookupForm'
import { CustomJSForm } from './config-forms/CustomJSForm'

interface TransformationTypeOption {
  value: TransformationType
  label: string
}

const TRANSFORMATION_TYPES: TransformationTypeOption[] = [
  { value: 'format_date', label: 'Date Format' },
  { value: 'format_number', label: 'Number Format' },
  { value: 'split', label: 'Split' },
  { value: 'concatenate', label: 'Concatenate' },
  { value: 'conditional', label: 'Conditional Logic' },
  { value: 'constant', label: 'Constant Value' },
  { value: 'lookup', label: 'Lookup Table' },
  { value: 'custom_js', label: 'Custom JavaScript' },
]

/**
 * Modal dialog for configuring transformations on mapping connections
 */
export function TransformationDialog() {
  const selectedConnectionId = useMappingStore((state) => state.selectedConnectionId)
  const connections = useMappingStore((state) => state.connections)
  const setSelectedConnectionId = useMappingStore((state) => state.setSelectedConnectionId)
  const setConnectionTransform = useMappingStore((state) => state.setConnectionTransform)
  const removeConnectionTransform = useMappingStore((state) => state.removeConnectionTransform)

  const [selectedType, setSelectedType] = useState<TransformationType>('format_date')
  const [config, setConfig] = useState<Record<string, unknown>>({})

  const connection = connections.find((c) => c.id === selectedConnectionId)

  // Load existing transformation when dialog opens
  useEffect(() => {
    if (connection?.transformation) {
      setSelectedType(connection.transformation.type)
      setConfig(connection.transformation.config)
    } else {
      // Reset to defaults
      setSelectedType('format_date')
      setConfig({})
    }
  }, [connection])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (selectedConnectionId) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedConnectionId])

  if (!selectedConnectionId || !connection) {
    return null
  }

  const handleClose = () => {
    setSelectedConnectionId(null)
  }

  const handleApply = () => {
    if (selectedConnectionId) {
      setConnectionTransform(selectedConnectionId, {
        type: selectedType,
        config,
      })
      handleClose()
    }
  }

  const handleRemove = () => {
    if (selectedConnectionId) {
      removeConnectionTransform(selectedConnectionId)
      handleClose()
    }
  }

  const handleTypeChange = (newType: TransformationType) => {
    setSelectedType(newType)
    // Reset config when type changes
    setConfig({})
  }

  const renderConfigForm = () => {
    switch (selectedType) {
      case 'format_date':
        return <DateFormatForm config={config} onChange={setConfig} />
      case 'format_number':
        return <NumberFormatForm config={config} onChange={setConfig} />
      case 'split':
        return <StringOpForm mode="split" config={config} onChange={setConfig} />
      case 'concatenate':
        return <StringOpForm mode="concatenate" config={config} onChange={setConfig} />
      case 'conditional':
        return <ConditionalForm config={config} onChange={setConfig} />
      case 'constant':
        return <ConstantForm config={config} onChange={setConfig} />
      case 'lookup':
        return <LookupForm config={config} onChange={setConfig} />
      case 'custom_js':
        return <CustomJSForm config={config} onChange={setConfig} />
      default:
        return <div className="text-gray-500">No configuration needed for this transformation type.</div>
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Configure Transformation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {connection.sourceFieldPath} → {connection.targetFieldPath}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Type Selector */}
          <div>
            <label htmlFor="transformation-type" className="block text-sm font-medium text-gray-700 mb-1">
              Transformation Type <span className="text-red-500">*</span>
            </label>
            <select
              id="transformation-type"
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value as TransformationType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              {TRANSFORMATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type-specific Configuration Form */}
          <div className="border-t border-gray-200 pt-4">
            {renderConfigForm()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {connection.transformation && (
              <button
                onClick={handleRemove}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
