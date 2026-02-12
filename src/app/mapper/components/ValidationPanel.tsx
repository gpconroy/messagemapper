'use client'

import React, { useState } from 'react'
import { type ValidationResult } from '@/validation'

interface ValidationPanelProps {
  validationResult: ValidationResult | null
  isValidating: boolean
}

/**
 * Collapsible panel displaying validation errors grouped by type.
 * Default state: expanded if errors exist, collapsed if valid.
 */
export function ValidationPanel({ validationResult, isValidating }: ValidationPanelProps) {
  const hasErrors = validationResult && !validationResult.valid
  const [isExpanded, setIsExpanded] = useState(hasErrors || false)

  // Update expanded state when validation result changes
  React.useEffect(() => {
    if (hasErrors) {
      setIsExpanded(true)
    }
  }, [hasErrors])

  // Count errors by severity
  const errorCount = validationResult?.errors.filter(e => e.severity === 'error').length || 0
  const warningCount = validationResult?.errors.filter(e => e.severity === 'warning').length || 0

  // Group errors by type
  const missingRequiredFields = validationResult?.errors.filter(e => e.type === 'missing_required') || []
  const typeMismatches = validationResult?.errors.filter(e => e.type === 'type_mismatch') || []

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
          validationResult?.valid
            ? 'bg-green-50 hover:bg-green-100'
            : 'bg-white hover:bg-gray-50'
        }`}
        aria-label={isExpanded ? 'Collapse validation panel' : 'Expand validation panel'}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
          <span className="text-gray-500">
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </span>

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-800">Validation</h3>

          {/* Loading Indicator */}
          {isValidating && (
            <span className="text-xs text-gray-500 animate-pulse">Validating...</span>
          )}

          {/* Status Icon and Counts */}
          {!isValidating && validationResult && (
            <>
              {validationResult.valid ? (
                <span className="flex items-center gap-1.5 text-sm text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  All validations passed
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                      {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                      {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </button>

      {/* Error List (Collapsible) */}
      {isExpanded && validationResult && !validationResult.valid && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 max-h-80 overflow-y-auto">
          {/* Missing Required Fields Section */}
          {missingRequiredFields.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Missing Required Fields
              </h4>
              <ul className="space-y-2">
                {missingRequiredFields.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 mt-0.5" title="Error" />
                    <div className="flex-1">
                      <p className="text-red-700 font-medium">{error.targetField}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{error.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Type Mismatches Section */}
          {typeMismatches.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Type Mismatches
              </h4>
              <ul className="space-y-2">
                {typeMismatches.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span
                      className={`flex-shrink-0 w-4 h-4 rounded-full mt-0.5 ${
                        error.severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                      title={error.severity === 'error' ? 'Error' : 'Warning'}
                    />
                    <div className="flex-1">
                      <p className={error.severity === 'error' ? 'text-red-700 font-medium' : 'text-yellow-700 font-medium'}>
                        {error.sourceField} → {error.targetField}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">{error.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Valid State Message */}
      {isExpanded && validationResult?.valid && (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <p className="text-sm text-green-700">No validation errors detected.</p>
        </div>
      )}
    </div>
  )
}
