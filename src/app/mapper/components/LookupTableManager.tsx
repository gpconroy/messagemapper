'use client'

import { useState, useEffect } from 'react'

interface LookupTable {
  id: string
  name: string
  description: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

interface LookupEntry {
  id: string
  fromValue: string
  toValue: string
  lookupTableId: string
  createdAt: string
  updatedAt: string
}

/**
 * Full CRUD management UI for lookup tables and entries
 */
export function LookupTableManager({ onClose }: { onClose?: () => void }) {
  const [tables, setTables] = useState<LookupTable[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [entries, setEntries] = useState<LookupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New table form
  const [newTableName, setNewTableName] = useState('')
  const [newTableDescription, setNewTableDescription] = useState('')
  const [creatingTable, setCreatingTable] = useState(false)

  // New entry form
  const [newEntryFrom, setNewEntryFrom] = useState('')
  const [newEntryTo, setNewEntryTo] = useState('')
  const [addingEntry, setAddingEntry] = useState(false)

  // Edit entry
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editEntryFrom, setEditEntryFrom] = useState('')
  const [editEntryTo, setEditEntryTo] = useState('')

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTableId) {
      fetchEntries(selectedTableId)
    }
  }, [selectedTableId])

  const fetchTables = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/lookup-tables')
      if (!response.ok) throw new Error('Failed to fetch tables')
      const data = await response.json()
      setTables(data.tables || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables')
    } finally {
      setLoading(false)
    }
  }

  const fetchEntries = async (tableId: string) => {
    try {
      const response = await fetch(`/api/lookup-tables/${tableId}/entries`)
      if (!response.ok) throw new Error('Failed to fetch entries')
      const data = await response.json()
      setEntries(data.entries || [])
    } catch (err) {
      console.error('Error fetching entries:', err)
      setEntries([])
    }
  }

  const handleCreateTable = async () => {
    if (!newTableName.trim()) return

    setCreatingTable(true)
    try {
      const response = await fetch('/api/lookup-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTableName.trim(),
          description: newTableDescription.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to create table')
      const data = await response.json()
      setTables([...tables, data.table])
      setNewTableName('')
      setNewTableDescription('')
      setSelectedTableId(data.table.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create table')
    } finally {
      setCreatingTable(false)
    }
  }

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Delete this table? All entries will be removed.')) return

    try {
      const response = await fetch(`/api/lookup-tables/${tableId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete table')
      setTables(tables.filter((t) => t.id !== tableId))
      if (selectedTableId === tableId) {
        setSelectedTableId(null)
        setEntries([])
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete table')
    }
  }

  const handleAddEntry = async () => {
    if (!selectedTableId || !newEntryFrom.trim()) return

    setAddingEntry(true)
    try {
      const response = await fetch(`/api/lookup-tables/${selectedTableId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromValue: newEntryFrom.trim(),
          toValue: newEntryTo.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to add entry')
      const data = await response.json()
      setEntries([...entries, data.entry])
      setNewEntryFrom('')
      setNewEntryTo('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add entry')
    } finally {
      setAddingEntry(false)
    }
  }

  const handleUpdateEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/lookup-tables/${selectedTableId}/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromValue: editEntryFrom.trim(),
          toValue: editEntryTo.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to update entry')
      const data = await response.json()
      setEntries(entries.map((e) => (e.id === entryId ? data.entry : e)))
      setEditingEntryId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update entry')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return

    try {
      const response = await fetch(`/api/lookup-tables/${selectedTableId}/entries/${entryId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete entry')
      setEntries(entries.filter((e) => e.id !== entryId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  const startEditEntry = (entry: LookupEntry) => {
    setEditingEntryId(entry.id)
    setEditEntryFrom(entry.fromValue)
    setEditEntryTo(entry.toValue)
  }

  const cancelEditEntry = () => {
    setEditingEntryId(null)
    setEditEntryFrom('')
    setEditEntryTo('')
  }

  const selectedTable = tables.find((t) => t.id === selectedTableId)

  return (
    <div className="flex h-full">
      {/* Left Panel: Tables List */}
      <div className="w-1/3 border-r border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Lookup Tables</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            {/* Tables List */}
            <div className="space-y-2 mb-4">
              {tables.length === 0 ? (
                <p className="text-sm text-gray-500">No tables yet. Create one below.</p>
              ) : (
                tables.map((table) => (
                  <div
                    key={table.id}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedTableId === table.id
                        ? 'bg-indigo-100 border border-indigo-300'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{table.name}</p>
                        {table.description && (
                          <p className="text-xs text-gray-500 truncate">{table.description}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTable(table.id)
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 text-sm"
                        title="Delete table"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create Table Form */}
            <div className="border-t border-gray-300 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">New Table</h4>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <textarea
                value={newTableDescription}
                onChange={(e) => setNewTableDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleCreateTable}
                disabled={creatingTable || !newTableName.trim()}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {creatingTable ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Entries */}
      <div className="flex-1 p-4">
        {selectedTable ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedTable.name}</h3>
            {selectedTable.description && (
              <p className="text-sm text-gray-500 mb-4">{selectedTable.description}</p>
            )}

            {/* Entries List */}
            <div className="space-y-2 mb-4">
              {entries.length === 0 ? (
                <p className="text-sm text-gray-500">No entries yet. Add one below.</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-white border border-gray-200 rounded-md"
                  >
                    {editingEntryId === entry.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editEntryFrom}
                          onChange={(e) => setEditEntryFrom(e.target.value)}
                          placeholder="From value"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <span className="text-gray-500">→</span>
                        <input
                          type="text"
                          value={editEntryTo}
                          onChange={(e) => setEditEntryTo(e.target.value)}
                          placeholder="To value"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => handleUpdateEntry(entry.id)}
                          className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditEntry}
                          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {entry.fromValue}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="text-sm text-gray-700 truncate">{entry.toValue}</span>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => startEditEntry(entry)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Entry Form */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Add Entry</h4>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newEntryFrom}
                  onChange={(e) => setNewEntryFrom(e.target.value)}
                  placeholder="From value"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-gray-500">→</span>
                <input
                  type="text"
                  value={newEntryTo}
                  onChange={(e) => setNewEntryTo(e.target.value)}
                  placeholder="To value"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleAddEntry}
                  disabled={addingEntry || !newEntryFrom.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {addingEntry ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a table to view and manage its entries</p>
          </div>
        )}
      </div>
    </div>
  )
}
