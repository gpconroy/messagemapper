'use client'

import { ConditionalConfig } from '@/transformations/types'

interface ConditionalFormProps {
  config: Partial<ConditionalConfig>
  onChange: (config: Partial<ConditionalConfig>) => void
}

/**
 * Configuration form for conditional logic transformation
 */
export function ConditionalForm({ config, onChange }: ConditionalFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-1">
          Operator <span className="text-red-500">*</span>
        </label>
        <select
          id="operator"
          value={config.operator || 'equals'}
          onChange={(e) => onChange({ ...config, operator: e.target.value as ConditionalConfig['operator'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="equals">Equals</option>
          <option value="notEquals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="startsWith">Starts With</option>
          <option value="endsWith">Ends With</option>
          <option value="greaterThan">Greater Than</option>
          <option value="lessThan">Less Than</option>
        </select>
      </div>

      <div>
        <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
          Comparison Value <span className="text-red-500">*</span>
        </label>
        <input
          id="value"
          type="text"
          value={config.value?.toString() || ''}
          onChange={(e) => onChange({ ...config, value: e.target.value })}
          placeholder="Enter value to compare"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="then-value" className="block text-sm font-medium text-gray-700 mb-1">
          Then Value <span className="text-red-500">*</span>
        </label>
        <input
          id="then-value"
          type="text"
          value={config.thenValue?.toString() || ''}
          onChange={(e) => onChange({ ...config, thenValue: e.target.value })}
          placeholder="Value if condition is true"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="else-value" className="block text-sm font-medium text-gray-700 mb-1">
          Else Value <span className="text-red-500">*</span>
        </label>
        <input
          id="else-value"
          type="text"
          value={config.elseValue?.toString() || ''}
          onChange={(e) => onChange({ ...config, elseValue: e.target.value })}
          placeholder="Value if condition is false"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-xs text-blue-800">
          The conditional transformation evaluates the source field value against the comparison value using the selected operator.
          If true, the &quot;Then Value&quot; is used; otherwise, the &quot;Else Value&quot; is used.
        </p>
      </div>
    </div>
  )
}
