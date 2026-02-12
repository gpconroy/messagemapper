'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { SchemaUploadPanel } from '@/app/mapper/components/SchemaUploadPanel'
import { MappingCanvas } from '@/app/mapper/components/MappingCanvas'
import { MappingToolbar } from '@/app/mapper/components/MappingToolbar'
import { ValidationPanel } from '@/app/mapper/components/ValidationPanel'
import { PreviewPanel } from '@/app/mapper/components/PreviewPanel'
import { useMappingState } from '@/app/mapper/hooks/useMappingState'
import { useMappingValidation } from '@/app/mapper/hooks/useMappingValidation'
import { useMappingStore } from '@/app/mapper/store/useMappingStore'
import { saveMappingConfig, saveSchemaToDB } from './actions'

type SchemaFormatType = 'json' | 'xml' | 'xsd' | 'json-schema'

function normalizeFormatType(formatType?: string): SchemaFormatType | undefined {
  if (!formatType) return undefined

  switch (formatType) {
    case 'json':
    case 'json-schema':
    case 'xml':
    case 'xsd':
      return formatType
    case 'json-sample':
      return 'json'
    case 'xml-sample':
      return 'xml'
    default:
      return undefined
  }
}

function MapperContent({
  workspaceId,
  workspaceName,
  canEdit,
}: {
  workspaceId: string
  workspaceName: string
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
  const { connections, sourceSchema, targetSchema, fieldTreeExpanded } = useMappingStore()

  // Panel visibility state
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  // Save dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [mappingName, setMappingName] = useState('')
  const [mappingDescription, setMappingDescription] = useState('')
  const [saveStatus, setSaveStatus] = useState<{
    type: 'idle' | 'saving' | 'success' | 'error'
    message?: string
    timestamp?: Date
  }>({ type: 'idle' })

  // Track saved schema IDs
  const [sourceSchemaId, setSourceSchemaId] = useState<string | null>(null)
  const [targetSchemaId, setTargetSchemaId] = useState<string | null>(null)
  const [sourceFormatType, setSourceFormatType] = useState<SchemaFormatType | null>(null)
  const [targetFormatType, setTargetFormatType] = useState<SchemaFormatType | null>(null)

  const [isPending, startTransition] = useTransition()

  // Handle schema upload and save to DB
  const handleSourceSchemaLoaded = async (fields: any[], label: string, formatType?: string) => {
    setSourceSchema(fields, label)
    const normalizedFormatType = normalizeFormatType(formatType)
    setSourceFormatType(normalizedFormatType ?? null)

    // Save schema to DB if not already saved
    if (!sourceSchemaId && canEdit && normalizedFormatType) {
      const result = await saveSchemaToDB({
        name: label,
        formatType: normalizedFormatType,
        schemaData: { fields },
      })

      if (result.success && result.schema) {
        setSourceSchemaId(result.schema.id)
      }
    }
  }

  const handleTargetSchemaLoaded = async (fields: any[], label: string, formatType?: string) => {
    setTargetSchema(fields, label)
    const normalizedFormatType = normalizeFormatType(formatType)
    setTargetFormatType(normalizedFormatType ?? null)

    // Save schema to DB if not already saved
    if (!targetSchemaId && canEdit && normalizedFormatType) {
      const result = await saveSchemaToDB({
        name: label,
        formatType: normalizedFormatType,
        schemaData: { fields },
      })

      if (result.success && result.schema) {
        setTargetSchemaId(result.schema.id)
      }
    }
  }

  // Handle save mapping
  const handleSaveMapping = async () => {
    if (!mappingName.trim()) {
      setSaveStatus({ type: 'error', message: 'Please enter a mapping name' })
      return
    }

    if (connections.length === 0) {
      setSaveStatus({ type: 'error', message: 'Please create at least one field mapping' })
      return
    }

    let resolvedSourceSchemaId = sourceSchemaId
    let resolvedTargetSchemaId = targetSchemaId

    // Lazy-persist schemas at save time if upload-time persistence was skipped/failed.
    if (!resolvedSourceSchemaId && canEdit && sourceSchema && sourceFormatType) {
      const result = await saveSchemaToDB({
        name: sourceSchema.label,
        formatType: sourceFormatType,
        schemaData: { fields: sourceSchema.fields },
      })

      if (!result.success || !result.schema) {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to save source schema' })
        return
      }

      resolvedSourceSchemaId = result.schema.id
      setSourceSchemaId(result.schema.id)
    }

    if (!resolvedTargetSchemaId && canEdit && targetSchema && targetFormatType) {
      const result = await saveSchemaToDB({
        name: targetSchema.label,
        formatType: targetFormatType,
        schemaData: { fields: targetSchema.fields },
      })

      if (!result.success || !result.schema) {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to save target schema' })
        return
      }

      resolvedTargetSchemaId = result.schema.id
      setTargetSchemaId(result.schema.id)
    }

    if (!resolvedSourceSchemaId || !resolvedTargetSchemaId) {
      setSaveStatus({
        type: 'error',
        message: 'Please upload both source and target schemas before saving',
      })
      return
    }

    setSaveStatus({ type: 'saving' })

    startTransition(async () => {
      const result = await saveMappingConfig({
        workspaceId,
        name: mappingName.trim(),
        description: mappingDescription.trim() || undefined,
        sourceSchemaId: resolvedSourceSchemaId,
        targetSchemaId: resolvedTargetSchemaId,
        mappingData: {
          connections,
          fieldTreeExpanded,
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
          message: 'Mapping saved successfully',
          timestamp: new Date(),
        })
        setIsSaveDialogOpen(false)
        setMappingName('')
        setMappingDescription('')
      } else {
        setSaveStatus({
          type: 'error',
          message: result.error || 'Failed to save mapping',
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
              ← Back to {workspaceName}
            </Link>
            <h1 className="text-2xl font-bold text-white">MessageMapper</h1>
          </div>

          {canEdit && (
            <div className="flex items-center gap-4">
              {saveStatus.type === 'success' && saveStatus.timestamp && (
                <span className="text-sm text-white/80">
                  Saved {saveStatus.timestamp.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => setIsSaveDialogOpen(true)}
                disabled={isPending || !connections.length}
                className="px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Save Mapping
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Upload Panels */}
      <div className="flex gap-4 bg-gray-50">
        <div className="flex-1">
          <SchemaUploadPanel
            side="source"
            onSchemaLoaded={(fields, label, formatType) =>
              handleSourceSchemaLoaded(fields, label, formatType)
            }
          />
        </div>
        <div className="flex-1">
          <SchemaUploadPanel
            side="target"
            onSchemaLoaded={(fields, label, formatType) =>
              handleTargetSchemaLoaded(fields, label, formatType)
            }
          />
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

      {/* Save Dialog */}
      {isSaveDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Save Mapping Configuration</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="mappingName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  id="mappingName"
                  type="text"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Order to Payment Mapping"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="mappingDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="mappingDescription"
                  value={mappingDescription}
                  onChange={(e) => setMappingDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Brief description of this mapping..."
                  rows={3}
                />
              </div>

              {saveStatus.type === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{saveStatus.message}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsSaveDialogOpen(false)
                  setSaveStatus({ type: 'idle' })
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={isPending || !mappingName.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function WorkspaceMapperClient({
  workspaceId,
  workspaceName,
  canEdit,
}: {
  workspaceId: string
  workspaceName: string
  canEdit: boolean
}) {
  return (
    <ReactFlowProvider>
      <MapperContent workspaceId={workspaceId} workspaceName={workspaceName} canEdit={canEdit} />
    </ReactFlowProvider>
  )
}
