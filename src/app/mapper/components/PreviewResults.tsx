'use client'

import React, { useState } from 'react'

interface RuleResult {
  ruleId: string
  type: string
  success: boolean
  output?: unknown
  error?: string
}

interface PreviewResultsProps {
  targetOutput: Record<string, unknown> | null
  ruleResults?: RuleResult[]
  errors?: string[]
  isLoading: boolean
}

/**
 * Display component for transformation preview results.
 * Shows the complete target output JSON with all mapped fields,
 * plus optional transformation details in a collapsible section.
 */
export function PreviewResults({
  targetOutput,
  ruleResults = [],
  errors = [],
  isLoading,
}: PreviewResultsProps) {
  const [showTransformDetails, setShowTransformDetails] = useState<boolean>(false)
  const [copySuccess, setCopySuccess] = useState<boolean>(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500 animate-pulse">Processing...</div>
      </div>
    )
  }

  if (!targetOutput) {
    return null
  }

  const successfulRules = ruleResults.filter((r) => r.success)
  const failedRules = ruleResults.filter((r) => !r.success)
  const hasErrors = errors.length > 0 || failedRules.length > 0

  const handleCopyToClipboard = async () => {
    if (!targetOutput) return

    try {
      const jsonString = JSON.stringify(targetOutput, null, 2)
      await navigator.clipboard.writeText(jsonString)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status Banner (only if errors) */}
      {hasErrors && (
        <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm font-medium text-yellow-800">
            Preview completed with {errors.length + failedRules.length} error(s)
          </p>
        </div>
      )}

      {/* Target Output Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Target Output</h4>
          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
            aria-label="Copy JSON to clipboard"
          >
            {copySuccess ? (
              <>
                <span className="text-green-600">✓</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>
        <pre className="bg-gray-100 border border-gray-200 rounded-md p-3 text-xs font-mono overflow-auto max-h-80">
          {JSON.stringify(targetOutput, null, 2)}
        </pre>
      </div>

      {/* Transformation Details Section (collapsible, only if there are rule results) */}
      {ruleResults.length > 0 && (
        <div>
          <button
            onClick={() => setShowTransformDetails(!showTransformDetails)}
            className="flex items-center justify-between w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
            aria-expanded={showTransformDetails}
            aria-controls="transformation-details"
          >
            <span className="text-sm font-semibold text-gray-700">
              Transformation Details ({ruleResults.length} rule{ruleResults.length !== 1 ? 's' : ''})
            </span>
            <span className="text-gray-500">
              {showTransformDetails ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          </button>

          {showTransformDetails && (
            <div id="transformation-details" className="mt-2 space-y-2">
              {/* Successful Rules */}
              {successfulRules.length > 0 && (
                <div className="space-y-2">
                  {successfulRules.map((rule) => (
                    <div
                      key={rule.ruleId}
                      className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded"
                    >
                      <span className="text-green-600 text-sm" aria-label="Success">
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{rule.type}</p>
                        {rule.output !== undefined && (
                          <p className="text-xs text-gray-600 font-mono truncate mt-1">
                            {JSON.stringify(rule.output)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Failed Rules */}
              {failedRules.length > 0 && (
                <div className="space-y-2">
                  {failedRules.map((rule) => (
                    <div
                      key={rule.ruleId}
                      className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded"
                    >
                      <span className="text-red-600 text-sm" aria-label="Failed">
                        ✗
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{rule.type}</p>
                        {rule.error && <p className="text-xs text-red-600 mt-1">{rule.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Global Errors */}
      {errors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-2">Errors</h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-600">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
