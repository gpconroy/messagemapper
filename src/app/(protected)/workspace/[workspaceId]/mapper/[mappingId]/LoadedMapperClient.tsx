'use client'

import Link from 'next/link'
import { useState, useEffect, useTransition } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { SchemaUploadPanel } from '@/app/mapper/components/SchemaUploadPanel'
import { MappingCanvas } from '@/app/mapper/components/MappingCanvas'
import { MappingToolbar } from '@/app/mapper/components/MappingToolbar'
import { ValidationPanel } from '@/app/mapper/components/ValidationPanel'
import { PreviewPanel } from '@/app/mapper/components/PreviewPanel'
import { useMappingState } from '@/app/mapper/hooks/useMappingState'
import { useMappingValidation } from '@/app/mapper/hooks/useMappingValidation'
import { useMappingStore } from '@/app/mapper/store/useMappingStore'
import { saveMappingConfig } from '../actions'

function MapperContent({
  workspaceId,
  mappingId,
  mapping,
  canEdit,
}: {
  workspaceId: string
  mappingId: string
  mapping: any
  canEdit: boolean
}) {
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

  // Save status
  const [saveStatus, setSaveStatus] = useState<{
    type: 'idle' | 'saving' | 'success' | 'error'
    message?: string
    timestamp?: Date
  }>({ type: 'idle' })

  const [isPending, startTransition] = useTransition()

  // Initialize the mapper with loaded data
  useEffect(() => {
    if (mapping.mappingData) {
      const data = mapping.mappingData as any

      // Load source schema
      if (data.sourceSchema) {
        setSourceSchema(data.sourceSchema.fields, data.sourceSchema.label)
      } else if (mapping.sourceSchema?.schemaData?.fields) {
        setSourceSchema(
          mapping.sourceSchema.schemaData.fields,
          mapping.sourceSchema.name
        )
      }

      // Load target schema
      if (data.targetSchema) {
        setTargetSchema(data.targetSchema.fields, data.targetSchema.label)
      } else if (mapping.targetSchema?.schemaData?.fields) {
        setTargetSchema(
          mapping.targetSchema.schemaData.fields,
          mapping.targetSchema.name
        )
      }

      // Load connections into store
      if (data.connections && Array.isArray(data.connections)) {
        // Clear existing connections first
        const store = useMappingStore.getState()

        // Add each connection
        data.connections.forEach((conn: any) => {
          store.addConnection(conn.sourceFieldPath, conn.targetFieldPath)
          if (conn.transformation) {
            store.setConnectionTransform(conn.id, conn.transformation)
          }
        })
      }
    }
  }, [mapping, setSourceSchema, setTargetSchema])

  // Handle save mapping (update)
  const handleSaveMapping = async () => {
    if (connections.length === 0) {
      setSaveStatus({ type: 'error', message: 'Please create at least one field mapping' })
      return
    }

    setSaveStatus({ type: 'saving' })

    startTransition(async () => {
      const result = await saveMappingConfig({
        workspaceId,
        mappingId,
        name: mapping.name,
        description: mapping.description || undefined,
        sourceSchemaId: mapping.sourceSchemaId,
        targetSchemaId: mapping.targetSchemaId,
        mappingData: {
          connections,
          sourceSchema: sourceSchema ? {
            fields: sourceSchema.fields,
            label: sourceSchema.label,
          } : null,
          targetSchema: targetSchema ? {
            fields: targetSchema.fields,
            label: targetSchema.label,
          } : null,
        },
      })

      if (result.success) {
        setSaveStatus({
          type: 'success',
          message: 'Mapping updated successfully',
          timestamp: new Date(),
        })
      } else {
        setSaveStatus({
          type: 'error',
          message: result.error || 'Failed to update mapping',
        })
      }
    })
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-green-600 border-b border-green-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/workspace/${workspaceId}`}
              className="text-sm text-white/80 hover:text-white hover:underline"
            >
              ← Back to Workspace
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{mapping.name}</h1>
              {mapping.description && (
                <p className="text-sm text-white/80">{mapping.description}</p>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-4">
              {saveStatus.type === 'success' && saveStatus.timestamp && (
                <span className="text-sm text-white/80">
                  Saved {saveStatus.timestamp.toLocaleTimeString()}
                </span>
              )}
              {saveStatus.type === 'error' && (
                <span className="text-sm text-red-200">
                  {saveStatus.message}
                </span>
              )}
              <button
                onClick={handleSaveMapping}
                disabled={isPending}
                className="px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Schema Info Display (instead of upload panels for loaded mappings) */}
      <div className="flex gap-4 bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-700 mb-1">Source Schema</div>
          <div className="text-sm text-gray-600">
            {mapping.sourceSchema.name} ({mapping.sourceSchema.formatType.toUpperCase()})
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-700 mb-1">Target Schema</div>
          <div className="text-sm text-gray-600">
            {mapping.targetSchema.name} ({mapping.targetSchema.formatType.toUpperCase()})
          </div>
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

export function LoadedMapperClient({
  workspaceId,
  mappingId,
  mapping,
  canEdit,
}: {
  workspaceId: string
  mappingId: string
  mapping: any
  canEdit: boolean
}) {
  return (
    <ReactFlowProvider>
      <MapperContent
        workspaceId={workspaceId}
        mappingId={mappingId}
        mapping={mapping}
        canEdit={canEdit}
      />
    </ReactFlowProvider>
  )
}
