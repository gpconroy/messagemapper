'use client'

import Link from 'next/link'
import { ReactFlowProvider } from '@xyflow/react'
import { SchemaUploadPanel } from './components/SchemaUploadPanel'
import { MappingCanvas } from './components/MappingCanvas'
import { useMappingState } from './hooks/useMappingState'

function MapperContent() {
  const { setSourceSchema, setTargetSchema } = useMappingState()

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">MessageMapper</h1>
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

      {/* Mapping Canvas */}
      <div className="flex-1 bg-gray-100">
        <MappingCanvas />
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
