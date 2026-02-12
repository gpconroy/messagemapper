'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMappingStore } from '../store/useMappingStore'
import { validateMapping, type ValidationResult, type ValidationError } from '@/validation'
import { useDebounce } from './useDebounce'

/**
 * Real-time mapping validation hook.
 * Runs validation with 500ms debouncing when connections change.
 */
export function useMappingValidation() {
  const { sourceSchema, targetSchema, connections } = useMappingStore()
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Create dependency key from connections to detect changes
  const dependencyKey = useMemo(() => {
    if (!connections.length) return 'empty'
    return `${connections.length}-${connections.map(c => c.id).join(',')}`
  }, [connections])

  // Debounce the dependency key by 500ms
  const debouncedKey = useDebounce(dependencyKey, 500)

  // Run validation when debounced key changes
  useEffect(() => {
    // Skip validation if no schemas loaded
    if (!targetSchema) {
      setValidationResult(null)
      return
    }

    setIsValidating(true)

    // Run validation
    const sourceFields = sourceSchema?.fields || []
    const targetFields = targetSchema.fields
    const result = validateMapping(sourceFields, targetFields, connections)

    setValidationResult(result)
    setIsValidating(false)
  }, [debouncedKey, sourceSchema, targetSchema, connections])

  // Compute error and warning counts
  const errorCount = useMemo(() => {
    if (!validationResult) return 0
    return validationResult.errors.filter(e => e.severity === 'error').length
  }, [validationResult])

  const warningCount = useMemo(() => {
    if (!validationResult) return 0
    return validationResult.errors.filter(e => e.severity === 'warning').length
  }, [validationResult])

  // Create field errors map for quick lookup by field path
  const fieldErrors = useMemo(() => {
    const map = new Map<string, ValidationError[]>()
    if (!validationResult) return map

    for (const error of validationResult.errors) {
      // Index by targetField for target-side errors
      if (error.targetField) {
        const existing = map.get(error.targetField) || []
        map.set(error.targetField, [...existing, error])
      }
      // Index by sourceField for source-side errors (if applicable)
      if (error.sourceField) {
        const existing = map.get(error.sourceField) || []
        map.set(error.sourceField, [...existing, error])
      }
    }

    return map
  }, [validationResult])

  return {
    validationResult,
    isValidating,
    errorCount,
    warningCount,
    fieldErrors,
  }
}
