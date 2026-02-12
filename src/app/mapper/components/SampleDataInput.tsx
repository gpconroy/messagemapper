'use client'

import React, { useState, useEffect } from 'react'
import { FieldNode } from '@/types/parser-types'
import { useDebounce } from '../hooks/useDebounce'

interface SampleDataInputProps {
  value: string
  onChange: (value: string) => void
  onParsed: (data: Record<string, unknown>) => void
  sourceFields?: FieldNode[]
}

/**
 * JSON textarea input component for entering sample data.
 * Provides real-time JSON validation with visual feedback.
 */
export function SampleDataInput({ value, onChange, onParsed, sourceFields }: SampleDataInputProps) {
  const [parseError, setParseError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState<boolean>(false)

  // Debounce the value to avoid excessive parsing during typing
  const debouncedValue = useDebounce(value, 300)

  useEffect(() => {
    // Validate JSON when debounced value changes
    if (!debouncedValue.trim()) {
      setParseError(null)
      setIsValid(false)
      return
    }

    try {
      const parsed = JSON.parse(debouncedValue)

      // Ensure parsed value is an object (not array or primitive)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setParseError('Sample data must be a JSON object')
        setIsValid(false)
        return
      }

      setParseError(null)
      setIsValid(true)
      onParsed(parsed as Record<string, unknown>)
    } catch (error) {
      const err = error as SyntaxError
      setParseError(`Invalid JSON: ${err.message}`)
      setIsValid(false)
    }
  }, [debouncedValue, onParsed])

  // Extract first 5 field names from source schema for hint
  const fieldHint = sourceFields
    ? sourceFields
        .slice(0, 5)
        .map((f) => f.name)
        .join(', ') + (sourceFields.length > 5 ? ', ...' : '')
    : null

  // Border color based on validation state
  const borderColor = !value.trim()
    ? 'border-gray-300'
    : isValid
    ? 'border-green-500'
    : 'border-red-500'

  return (
    <div className="space-y-2">
      <label htmlFor="sample-data-input" className="block text-sm font-medium text-gray-700">
        Sample Data (JSON)
      </label>

      <textarea
        id="sample-data-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'{\n  "fieldName": "value",\n  "amount": 100\n}'}
        className={`w-full px-3 py-2 text-sm font-mono border ${borderColor} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y`}
        rows={8}
        aria-label="Enter sample JSON data for testing"
        aria-invalid={parseError !== null}
        aria-describedby={parseError ? 'parse-error' : fieldHint ? 'field-hint' : undefined}
      />

      {parseError && (
        <p id="parse-error" className="text-sm text-red-600" role="alert">
          {parseError}
        </p>
      )}

      {!parseError && fieldHint && (
        <p id="field-hint" className="text-xs text-gray-500">
          Expected fields: {fieldHint}
        </p>
      )}
    </div>
  )
}
