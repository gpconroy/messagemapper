'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { SchemaUploadPanel } from './components/SchemaUploadPanel'
import { MappingCanvas } from './components/MappingCanvas'
import { MappingToolbar } from './components/MappingToolbar'
import { ValidationPanel } from './components/ValidationPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { useMappingState } from './hooks/useMappingState'
import { useMappingValidation } from './hooks/useMappingValidation'
import { useMappingStore } from './store/useMappingStore'

function MapperContent() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgesDelete,
    setSourceSchema,
    setTargetSchema,
    mappedSourcePaths,
    mappedTargetPaths,
  } = useMappingState()

  // Validation state
  const { validationResult, isValidating, fieldErrors } = useMappingValidation()

  // Get connections and schemas for preview panel
  const { connections, sourceSchema, targetSchema } = useMappingStore()

  // Panel visibility state
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-green-600 border-b border-green-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-white/80 hover:text-white hover:underline"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white">MessageMapper</h1>
        </div>
      </header>

      {/* Upload Panels */}
      <div className="flex gap-4 bg-gray-50">
        <div className="flex-1">
          <SchemaUploadPanel side="source" onSchemaLoaded={setSourceSchema} />
        </div>
        <div className="flex-1">
          <SchemaUploadPanel side="target" onSchemaLoaded={setTargetSchema} />
        </div>
      </div>

      {/* Mapping Toolbar */}
      <MappingToolbar />

      {/* Mapping Canvas and Bottom Panel */}
      <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 min-h-0">
          <MappingCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            mappedSourcePaths={mappedSourcePaths}
            mappedTargetPaths={mappedTargetPaths}
            validationErrors={fieldErrors}
          />
        </div>

        {/* Bottom Panel: Validation and Preview */}
        <div
          className={`border-t border-gray-300 bg-white transition-all duration-300 ${
            isPanelOpen ? 'h-80' : 'h-10'
          }`}
        >
          {/* Panel Toggle Button */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 border-b border-gray-200"
          >
            <span className="text-sm font-medium text-gray-700">
              Validation & Preview
            </span>
            <span className="text-gray-500">
              {isPanelOpen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </span>
          </button>

          {/* Panel Content */}
          {isPanelOpen && (
            <div className="flex gap-4 p-4 h-[calc(100%-40px)] overflow-y-auto">
              {/* Left: Validation Panel */}
              <div className="flex-1">
                <ValidationPanel
                  validationResult={validationResult}
                  isValidating={isValidating}
                />
              </div>

              {/* Right: Preview Panel */}
              <div className="flex-1">
                <PreviewPanel
                  connections={connections}
                  sourceFields={sourceSchema?.fields}
                  targetSchema={targetSchema}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MapperPage() {
  return (
    <ReactFlowProvider>
      <MapperContent />
    </ReactFlowProvider>
  )
}
