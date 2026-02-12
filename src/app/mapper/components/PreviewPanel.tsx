'use client'

import React, { useState } from 'react'
import { FieldNode } from '@/types/parser-types'
import { SampleDataInput } from './SampleDataInput'
import { PreviewResults } from './PreviewResults'
import { buildTargetOutput } from '@/lib/sample-data-extractor'

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
  targetSchema?: { fields: FieldNode[]; label: string } | null
}

interface RuleResult {
  ruleId: string
  type: string
  success: boolean
  output?: unknown
  error?: string
}

/**
 * Container component orchestrating the preview workflow.
 * Users upload a sample file, click "Run Preview", and see the complete target output
 * with ALL connections (direct passthrough + transformations) applied.
 */
export function PreviewPanel({ connections, sourceFields, targetSchema }: PreviewPanelProps) {
  const [sourceValues, setSourceValues] = useState<Record<string, unknown> | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<{
    targetOutput: Record<string, unknown>
    ruleResults?: RuleResult[]
    errors?: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Enable preview when we have source values and at least one connection
  const canRunPreview = sourceValues !== null && connections.length > 0 && !isLoading

  const handleFileLoaded = (values: Record<string, unknown>, name: string) => {
    setSourceValues(values)
    setFileName(name)
    setError(null)
    setPreviewResult(null)
  }

  const handleRunPreview = async () => {
    if (!sourceValues) return

    setIsLoading(true)
    setError(null)
    setPreviewResult(null)

    try {
      // Separate connections into two groups
      const connectionsWithTransformations = connections.filter(
        (c) => c.transformation && c.transformation.type !== 'direct'
      )
      const directConnections = connections.filter(
        (c) => !c.transformation || c.transformation.type === 'direct'
      )

      let transformedValuesMap: Record<string, unknown> = {}
      let ruleResults: RuleResult[] = []
      let errors: string[] = []

      // If there are connections with transformations, run them through the preview API
      if (connectionsWithTransformations.length > 0) {
        // Build transformation rules array
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
            sampleData: sourceValues,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        // Build map of connection ID -> transformed output
        if (result.data.ruleResults) {
          ruleResults = result.data.ruleResults
          for (const ruleResult of result.data.ruleResults) {
            if (ruleResult.success && ruleResult.output !== undefined) {
              transformedValuesMap[ruleResult.ruleId] = ruleResult.output
            }
          }
        }

        if (result.data.errors) {
          errors = result.data.errors
        }
      }

      // Build complete target output using ALL connections
      const targetOutput = buildTargetOutput(connections, sourceValues, transformedValuesMap)

      setPreviewResult({
        targetOutput,
        ruleResults: ruleResults.length > 0 ? ruleResults : undefined,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Network error: Unable to preview transformations'
      setError(errorMessage)
      console.error('Preview error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Test with Sample Data</h3>

      {/* Sample Data File Upload */}
      <SampleDataInput onFileLoaded={handleFileLoaded} isLoading={isLoading} />

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
      <PreviewResults
        targetOutput={previewResult?.targetOutput || null}
        ruleResults={previewResult?.ruleResults}
        errors={previewResult?.errors}
        isLoading={isLoading}
      />
    </div>
  )
}
