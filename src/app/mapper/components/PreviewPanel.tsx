'use client'

import React, { useState } from 'react'
import { FieldNode } from '@/types/parser-types'
import { SampleDataInput } from './SampleDataInput'
import { PreviewResults } from './PreviewResults'

interface Connection {
  id: string
  sourceFieldPath: string
  targetFieldPath: string
  transformation?: {
    type: string
    config: Record<string, unknown>
    label?: string
  }
}

interface PreviewPanelProps {
  connections: Connection[]
  sourceFields?: FieldNode[]
}

/**
 * Container component orchestrating the preview workflow.
 * Users enter sample JSON data, click "Run Preview", and see transformation results.
 */
export function PreviewPanel({ connections, sourceFields }: PreviewPanelProps) {
  const [sampleDataText, setSampleDataText] = useState<string>('')
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)
  const [previewResult, setPreviewResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Filter connections that have transformations
  const connectionsWithTransformations = connections.filter((c) => c.transformation)

  const canRunPreview = parsedData !== null && connectionsWithTransformations.length > 0 && !isLoading

  const handleRunPreview = async () => {
    if (!parsedData) return

    setIsLoading(true)
    setError(null)
    setPreviewResult(null)

    try {
      // Build transformation rules array from connections with transformations
      const rules = connectionsWithTransformations.map((connection, index) => ({
        id: connection.id,
        type: connection.transformation!.type,
        sourceFields: [connection.sourceFieldPath],
        targetField: connection.targetFieldPath,
        config: connection.transformation!.config,
        order: index,
      }))

      // POST to preview API
      const response = await fetch('/api/transformations/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rules,
          sampleData: parsedData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setPreviewResult(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error: Unable to preview transformations'
      setError(errorMessage)
      console.error('Preview error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Test with Sample Data</h3>

      {/* Sample Data Input */}
      <SampleDataInput
        value={sampleDataText}
        onChange={setSampleDataText}
        onParsed={setParsedData}
        sourceFields={sourceFields}
      />

      {/* Info message if no transformations */}
      {connectionsWithTransformations.length === 0 && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Add transformations to your mappings to preview results
          </p>
        </div>
      )}

      {/* Run Preview Button */}
      <button
        onClick={handleRunPreview}
        disabled={!canRunPreview}
        className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          canRunPreview
            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        aria-label="Run transformation preview"
      >
        {isLoading ? 'Processing...' : 'Run Preview'}
      </button>

      {/* Network/API Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Preview Results */}
      <PreviewResults result={previewResult} isLoading={isLoading} />
    </div>
  )
}
