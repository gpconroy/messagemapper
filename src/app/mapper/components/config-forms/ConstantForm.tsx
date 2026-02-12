'use client'

import { useState } from 'react'
import { ConstantConfig } from '@/transformations/types'

interface ConstantFormProps {
  config: Partial<ConstantConfig>
  onChange: (config: Partial<ConstantConfig>) => void
}

type ValueType = 'string' | 'number' | 'boolean' | 'null'

/**
 * Configuration form for constant value transformation
 */
export function ConstantForm({ config, onChange }: ConstantFormProps) {
  const [valueType, setValueType] = useState<ValueType>(() => {
    if (config.value === null) return 'null'
    if (typeof config.value === 'boolean') return 'boolean'
    if (typeof config.value === 'number') return 'number'
    return 'string'
  })

  const [stringValue, setStringValue] = useState<string>(() => {
    if (config.value === null || config.value === undefined) return ''
    return String(config.value)
  })

  const handleTypeChange = (newType: ValueType) => {
    setValueType(newType)

    // Convert value based on new type
    switch (newType) {
      case 'string':
        onChange({ value: stringValue })
        break
      case 'number':
        onChange({ value: stringValue ? parseFloat(stringValue) : 0 })
        break
      case 'boolean':
        onChange({ value: stringValue.toLowerCase() === 'true' })
        break
      case 'null':
        onChange({ value: null })
        break
    }
  }

  const handleValueChange = (newValue: string) => {
    setStringValue(newValue)

    // Convert based on current type
    switch (valueType) {
      case 'string':
        onChange({ value: newValue })
        break
      case 'number':
        onChange({ value: newValue ? parseFloat(newValue) : 0 })
        break
      case 'boolean':
        onChange({ value: newValue.toLowerCase() === 'true' })
        break
      case 'null':
        // No change needed
        break
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="value-type" className="block text-sm font-medium text-gray-700 mb-1">
          Value Type <span className="text-red-500">*</span>
        </label>
        <select
          id="value-type"
          value={valueType}
          onChange={(e) => handleTypeChange(e.target.value as ValueType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="null">Null</option>
        </select>
      </div>

      {valueType !== 'null' && (
        <div>
          <label htmlFor="constant-value" className="block text-sm font-medium text-gray-700 mb-1">
            Constant Value <span className="text-red-500">*</span>
          </label>
          {valueType === 'boolean' ? (
            <select
              id="constant-value"
              value={stringValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              id="constant-value"
              type={valueType === 'number' ? 'number' : 'text'}
              value={stringValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={valueType === 'number' ? '0' : 'Enter constant value'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-xs text-blue-800">
          The constant transformation ignores the source field value and always returns the specified constant value.
        </p>
      </div>
    </div>
  )
}
