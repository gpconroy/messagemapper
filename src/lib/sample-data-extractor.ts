/**
 * Utility functions for extracting sample data values and building target outputs.
 * Used by the preview panel to map real source values to target structure.
 */

/**
 * Recursively flattens parsed JSON/XML data into a map keyed by dot-notation paths.
 * Path format matches FieldNode path convention: "parent.child", "parent.items[]" for arrays.
 *
 * @param data - Parsed JSON/XML object (raw data, not FieldNodes)
 * @param parentPath - Current path prefix (used internally for recursion)
 * @returns Record mapping paths to leaf values (strings, numbers, booleans, null)
 *
 * @example
 * flattenToPathMap({ payment: { amount: 100, sender: { name: "John" } } })
 * // Returns: { "payment.amount": 100, "payment.sender.name": "John" }
 */
export function flattenToPathMap(
  data: unknown,
  parentPath: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Handle null/undefined
  if (data === null || data === undefined) {
    return result
  }

  // Handle primitive types - these are leaf values
  if (typeof data !== 'object') {
    if (parentPath) {
      result[parentPath] = data
    }
    return result
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return result
    }

    // For arrays, use first element as template and add [] suffix to path
    const firstItem = data[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      // Array of objects - flatten first element with [] suffix
      const itemPath = parentPath ? `${parentPath}[]` : '[]'
      const flattened = flattenToPathMap(firstItem, itemPath)
      Object.assign(result, flattened)
    } else {
      // Array of primitives - store with [] suffix
      const arrayPath = parentPath ? `${parentPath}[]` : '[]'
      result[arrayPath] = firstItem
    }
    return result
  }

  // Handle objects
  for (const [key, value] of Object.entries(data)) {
    // Skip XML parser artifacts
    if (key === '#text') {
      continue
    }

    // Handle XML attributes (prefixed with @_ by fast-xml-parser)
    if (key.startsWith('@_')) {
      const attrName = key.substring(2) // Remove @_ prefix
      const attrPath = parentPath ? `${parentPath}@${attrName}` : `@${attrName}`
      result[attrPath] = value
      continue
    }

    // Build child path
    const childPath = parentPath ? `${parentPath}.${key}` : key

    // Recursively flatten child
    const childValues = flattenToPathMap(value, childPath)
    Object.assign(result, childValues)
  }

  return result
}

/**
 * Builds a nested target JSON object from connections and source values.
 * For each connection, resolves the source value and places it at the target path.
 * Handles both direct passthrough and transformed values.
 *
 * @param connections - Array of mapping connections with source/target paths
 * @param sourceValues - Flat map of source path -> value (from flattenToPathMap)
 * @param transformedValues - Optional map of connection ID -> transformed output value
 * @returns Nested target object with mapped values
 *
 * @example
 * buildTargetOutput(
 *   [{ id: "conn1", sourceFieldPath: "payment.amount", targetFieldPath: "transfer.paymentAmount" }],
 *   { "payment.amount": 1500.50 }
 * )
 * // Returns: { transfer: { paymentAmount: 1500.50 } }
 */
export function buildTargetOutput(
  connections: Array<{
    id: string
    sourceFieldPath: string
    targetFieldPath: string
    transformation?: { type: string; config: Record<string, unknown> }
  }>,
  sourceValues: Record<string, unknown>,
  transformedValues?: Record<string, unknown>
): Record<string, unknown> {
  const target: Record<string, unknown> = {}

  for (const connection of connections) {
    // Determine the value to use
    let value: unknown

    // Check if this connection has a transformed value
    if (transformedValues && connection.id in transformedValues) {
      value = transformedValues[connection.id]
    } else {
      // Use direct source value (passthrough)
      value = sourceValues[connection.sourceFieldPath]
    }

    // Skip if value is undefined (field not present in source)
    if (value === undefined) {
      continue
    }

    // Set value at target path
    setValueAtPath(target, connection.targetFieldPath, value)
  }

  return target
}

/**
 * Sets a value at a nested path within an object, creating intermediate objects as needed.
 * Handles both regular paths (dot-separated) and array paths (containing []).
 *
 * @param obj - Object to modify
 * @param path - Dot-notation path (e.g., "transfer.fromAccount.holderName" or "items[].name")
 * @param value - Value to set at the path
 *
 * @example
 * const obj = {}
 * setValueAtPath(obj, "transfer.fromAccount.holderName", "John Doe")
 * // obj is now: { transfer: { fromAccount: { holderName: "John Doe" } } }
 */
function setValueAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  // Split path by dots
  const parts = path.split('.')
  let current: any = obj

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const isLast = i === parts.length - 1

    // Check if this part includes array notation []
    if (part.includes('[]')) {
      const arrayKey = part.replace('[]', '')

      // Create array if it doesn't exist
      if (!current[arrayKey]) {
        current[arrayKey] = [{}]
      } else if (!Array.isArray(current[arrayKey])) {
        current[arrayKey] = [{}]
      }

      // If last part, set value in first array element
      if (isLast) {
        current[arrayKey][0] = value
      } else {
        // Continue traversing into first array element
        if (current[arrayKey].length === 0) {
          current[arrayKey].push({})
        }
        current = current[arrayKey][0]
      }
    } else {
      // Regular property
      if (isLast) {
        current[part] = value
      } else {
        // Create intermediate object if needed
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part]
      }
    }
  }
}
