'use client'

import { useEffect, useState } from 'react'
import { useMappingStore } from '../store/useMappingStore'
import { LookupTableManager } from './LookupTableManager'

function useUndoRedo() {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    // Check initial state
    const temporal = useMappingStore.temporal.getState()
    setCanUndo(temporal.pastStates.length > 0)
    setCanRedo(temporal.futureStates.length > 0)

    // Subscribe to changes
    const unsub = useMappingStore.temporal.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0)
      setCanRedo(state.futureStates.length > 0)
    })

    return unsub
  }, [])

  const undo = () => {
    useMappingStore.temporal.getState().undo()
  }

  const redo = () => {
    useMappingStore.temporal.getState().redo()
  }

  return { undo, redo, canUndo, canRedo }
}

export function MappingToolbar() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()
  const [showLookupManager, setShowLookupManager] = useState(false)
  const connections = useMappingStore((state) => state.connections)
  const setSelectedConnectionId = useMappingStore((state) => state.setSelectedConnectionId)
  const [selectedConnectionId, setSelectedConnectionIdLocal] = useState<string>('')

  // Keep local selection in sync with current connections list
  useEffect(() => {
    if (connections.length === 0) {
      setSelectedConnectionIdLocal('')
      return
    }

    const stillExists = connections.some((connection) => connection.id === selectedConnectionId)
    if (!stillExists) {
      setSelectedConnectionIdLocal(connections[0].id)
    }
  }, [connections, selectedConnectionId])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier && event.key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      // Also support Ctrl+Y for redo (Windows convention)
      if (modifier && event.key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Undo (Ctrl+Z)"
            aria-label="Undo last mapping action"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo last undone action"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
            Redo
          </button>
        </div>
        <div className="h-6 border-l border-gray-300" />
        <button
          onClick={() => setShowLookupManager(true)}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5"
          title="Manage Lookup Tables"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Lookup Tables
        </button>
        <div className="h-6 border-l border-gray-300" />
        <label className="sr-only" htmlFor="connection-transform-picker">
          Pick connection to edit transformation
        </label>
        <select
          id="connection-transform-picker"
          value={selectedConnectionId}
          onChange={(event) => setSelectedConnectionIdLocal(event.target.value)}
          disabled={connections.length === 0}
          className="px-2 py-1.5 text-sm rounded border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed max-w-[320px]"
          title="Select a mapping connection to configure transformation"
        >
          {connections.length === 0 ? (
            <option value="">No mappings yet</option>
          ) : (
            connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.sourceFieldPath} → {connection.targetFieldPath}
              </option>
            ))
          )}
        </select>
        <button
          onClick={() => {
            if (selectedConnectionId) {
              setSelectedConnectionId(selectedConnectionId)
            }
          }}
          disabled={!selectedConnectionId}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Open transformation editor for selected mapping"
        >
          Edit Transform
        </button>
        <div className="h-6 border-l border-gray-300" />
        <span className="text-xs text-gray-500">
          {canUndo ? 'Changes tracked' : 'No changes to undo'}
        </span>
      </div>

      {/* Lookup Table Manager Modal */}
      {showLookupManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] overflow-hidden">
            <LookupTableManager onClose={() => setShowLookupManager(false)} />
          </div>
        </div>
      )}
    </>
  )
}
