'use client'

import React from 'react'

interface RuleResult {
  ruleId: string
  type: string
  success: boolean
  output?: unknown
  error?: string
}

interface PreviewResultData {
  result: Record<string, unknown>
  ruleResults: RuleResult[]
  errors?: string[]
}

interface PreviewResultsProps {
  result: { data: PreviewResultData } | null
  isLoading: boolean
}

/**
 * Display component for transformation preview results.
 * Shows success/failure status, output JSON, and per-rule results.
 */
export function PreviewResults({ result, isLoading }: PreviewResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500 animate-pulse">Processing...</div>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const { ruleResults, errors = [] } = result.data
  const successfulRules = ruleResults.filter((r) => r.success)
  const failedRules = ruleResults.filter((r) => !r.success)

  // Determine overall status
  const hasErrors = errors.length > 0 || failedRules.length > 0
  const isPartialSuccess = successfulRules.length > 0 && failedRules.length > 0
  const isCompleteFailure = successfulRules.length === 0 && hasErrors
  const isSuccess = successfulRules.length > 0 && !hasErrors

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {isCompleteFailure && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">Transformation failed</p>
        </div>
      )}

      {isPartialSuccess && (
        <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm font-medium text-yellow-800">
            {successfulRules.length} rule(s) succeeded, {failedRules.length} failed
          </p>
        </div>
      )}

      {isSuccess && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">
            Transformation successful - {ruleResults.length} rule(s) applied
          </p>
        </div>
      )}

      {/* Output Section */}
      {!isCompleteFailure && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Output</h4>
          <pre className="bg-gray-100 border border-gray-200 rounded-md p-3 text-xs font-mono overflow-auto max-h-60">
            {JSON.stringify(result.data.result, null, 2)}
          </pre>
        </div>
      )}

      {/* Rule Results Section */}
      {ruleResults.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Rule Results</h4>

          {/* Successful Rules */}
          {successfulRules.length > 0 && (
            <div className="space-y-2 mb-3">
              {successfulRules.map((rule) => (
                <div key={rule.ruleId} className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded">
                  <span className="text-green-600 text-sm" aria-label="Success">
                    ✓
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {rule.type}
                    </p>
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
                <div key={rule.ruleId} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                  <span className="text-red-600 text-sm" aria-label="Failed">
                    ✗
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {rule.type}
                    </p>
                    {rule.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {rule.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
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
