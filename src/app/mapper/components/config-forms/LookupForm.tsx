'use client'

import { useState, useEffect } from 'react'

interface LookupFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

interface LookupTable {
  id: string
  name: string
  description: string
}

/**
 * Configuration form for lookup table transformations
 */
export function LookupForm({ config, onChange }: LookupFormProps) {
  const [tables, setTables] = useState<LookupTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showManager, setShowManager] = useState(false)

  const tableId = (config.tableId as string) || ''
  const defaultValue = (config.defaultValue as string) || ''

  // Fetch available lookup tables on mount
  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/lookup-tables')
      if (!response.ok) {
        throw new Error(`Failed to fetch tables: ${response.statusText}`)
      }
      const data = await response.json()
      setTables(data.tables || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables')
      console.error('Error fetching lookup tables:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTableChange = (newTableId: string) => {
    onChange({ ...config, tableId: newTableId })
  }

  const handleDefaultValueChange = (newDefaultValue: string) => {
    onChange({ ...config, defaultValue: newDefaultValue })
  }

  return (
    <div className="space-y-4">
      {/* Lookup Table Selection */}
      <div>
        <label htmlFor="lookup-table" className="block text-sm font-medium text-gray-700 mb-1">
          Lookup Table <span className="text-red-500">*</span>
        </label>
        {loading ? (
          <div className="text-sm text-gray-500">Loading tables...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : tables.length === 0 ? (
          <div className="text-sm text-gray-500">
            No lookup tables available. Click "Manage Tables" to create one.
          </div>
        ) : (
          <select
            id="lookup-table"
            value={tableId}
            onChange={(e) => handleTableChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a table...</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        )}
        {tableId && (
          <p className="text-xs text-gray-500 mt-1">
            {tables.find((t) => t.id === tableId)?.description || ''}
          </p>
        )}
      </div>

      {/* Default Value */}
      <div>
        <label htmlFor="default-value" className="block text-sm font-medium text-gray-700 mb-1">
          Default Value
        </label>
        <input
          id="default-value"
          type="text"
          value={defaultValue}
          onChange={(e) => handleDefaultValueChange(e.target.value)}
          placeholder="Value to use when no match found (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          This value will be used when the input value is not found in the lookup table.
        </p>
      </div>

      {/* Manage Tables Button */}
      <div className="pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowManager(!showManager)}
          className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
        >
          {showManager ? 'Close Manager' : 'Manage Tables'}
        </button>
      </div>

      {/* Lookup Table Manager (inline) */}
      {showManager && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            Lookup table management will open in a modal. (Feature placeholder - actual LookupTableManager component will be integrated here)
          </p>
          <button
            type="button"
            onClick={fetchTables}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            Refresh Tables
          </button>
        </div>
      )}
    </div>
  )
}
