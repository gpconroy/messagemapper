import type { BaseParser, FieldNode, FieldType, ParseOptions, ValidationResult } from '@/types/parser-types'
import { normalizeType, generatePath, generateId } from './normalize'

export class JsonSampleParser implements BaseParser {
  readonly format = 'json-sample' as const

  async validate(content: string): Promise<ValidationResult> {
    try {
      JSON.parse(content)
      return { valid: true, errors: [] }
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }

  async parse(content: string, options?: ParseOptions): Promise<FieldNode[]> {
    const maxDepth = options?.maxDepth ?? 50
    const parsed = JSON.parse(content)

    // If top level is an object, extract its fields
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return this.inferFields(parsed, '', 0, maxDepth)
    }

    // If top level is array or primitive, wrap it
    return []
  }

  private inferFields(
    obj: any,
    parentPath: string,
    currentDepth: number,
    maxDepth: number
  ): FieldNode[] {
    // Stop at max depth
    if (currentDepth >= maxDepth) {
      return []
    }

    if (typeof obj !== 'object' || obj === null) {
      return []
    }

    const fields: FieldNode[] = []

    for (const [name, value] of Object.entries(obj)) {
      const path = generatePath(parentPath, name)
      const id = generateId(path)

      // Handle array
      if (Array.isArray(value)) {
        const arrayNode: FieldNode = {
          id,
          name,
          path,
          type: 'array',
          required: false, // Samples can't determine required fields
          children: [],
        }

        // Infer structure from first element
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const arrayItemsPath = generatePath(parentPath, name, true)
          arrayNode.children = this.inferFields(
            value[0],
            arrayItemsPath,
            currentDepth + 1,
            maxDepth
          )
        }

        fields.push(arrayNode)
        continue
      }

      // Handle nested object
      if (typeof value === 'object' && value !== null) {
        const objectNode: FieldNode = {
          id,
          name,
          path,
          type: 'object',
          required: false,
          children: this.inferFields(value, path, currentDepth + 1, maxDepth),
        }
        fields.push(objectNode)
        continue
      }

      // Handle primitive types
      const inferredType = this.inferType(value)
      fields.push({
        id,
        name,
        path,
        type: inferredType,
        required: false,
        children: [],
      })
    }

    return fields
  }

  private inferType(value: any): FieldType {
    if (value === null) {
      return 'null'
    }

    const type = typeof value

    if (type === 'string') {
      // Check if it's an ISO date string
      if (this.isISODate(value)) {
        return 'date'
      }
      return 'string'
    }

    if (type === 'number') {
      // Check if it's an integer
      if (Number.isInteger(value)) {
        return 'integer'
      }
      return 'number'
    }

    if (type === 'boolean') {
      return 'boolean'
    }

    // Fallback
    return normalizeType(type)
  }

  private isISODate(value: string): boolean {
    // Match ISO 8601 date formats
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/
    return isoDateRegex.test(value)
  }
}
