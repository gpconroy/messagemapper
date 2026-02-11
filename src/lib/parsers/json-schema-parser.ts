import type { BaseParser, FieldNode, ParseOptions, ValidationResult } from '@/types/parser-types'
import { normalizeType, generatePath, generateId } from './normalize'

export class JsonSchemaParser implements BaseParser {
  readonly format = 'json-schema' as const

  async validate(content: string): Promise<ValidationResult> {
    try {
      const parsed = JSON.parse(content)

      // Check if it looks like a JSON Schema
      if (typeof parsed !== 'object' || parsed === null) {
        return {
          valid: false,
          errors: ['Content must be a JSON object'],
        }
      }

      // Valid if it has $schema, or has type with properties
      const hasSchemaIndicator =
        parsed.$schema ||
        (parsed.type && parsed.properties) ||
        parsed.properties // Some schemas omit type at root

      if (!hasSchemaIndicator) {
        return {
          valid: false,
          errors: ['Content does not appear to be a valid JSON Schema'],
        }
      }

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

    // Dereference $ref pointers using our own resolver
    const dereferenced = this.dereferenceRefs(parsed, parsed)

    // Extract fields from root properties
    if (!dereferenced.properties) {
      return []
    }

    const requiredFields = new Set<string>((dereferenced.required as string[]) || [])

    return this.extractFields(
      dereferenced.properties,
      '',
      requiredFields,
      0,
      maxDepth,
      parsed
    )
  }

  /**
   * Simple $ref resolver for JSON Schema
   * Handles internal references like #/$defs/Address
   */
  private dereferenceRefs(obj: any, root: any, visited = new Set<string>()): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.dereferenceRefs(item, root, visited))
    }

    // Handle $ref
    if (obj.$ref && typeof obj.$ref === 'string') {
      const refPath = obj.$ref

      // Avoid circular references
      if (visited.has(refPath)) {
        return { type: 'object' } // Return stub for circular refs
      }

      visited.add(refPath)

      // Only handle internal references starting with #/
      if (refPath.startsWith('#/')) {
        const path = refPath.slice(2).split('/')
        let target = root

        for (const segment of path) {
          target = target[segment]
          if (!target) break
        }

        if (target) {
          return this.dereferenceRefs(target, root, visited)
        }
      }

      return obj
    }

    // Recursively process object properties
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.dereferenceRefs(value, root, visited)
    }

    return result
  }

  private extractFields(
    properties: Record<string, any>,
    parentPath: string,
    requiredFields: Set<string>,
    currentDepth: number,
    maxDepth: number,
    root?: any
  ): FieldNode[] {
    // Stop at max depth
    if (currentDepth >= maxDepth) {
      return []
    }

    const fields: FieldNode[] = []

    for (const [name, prop] of Object.entries(properties)) {
      const path = generatePath(parentPath, name)
      const id = generateId(path)
      const required = requiredFields.has(name)

      // Handle array type
      if (prop.type === 'array' && prop.items) {
        const arrayItemsPath = generatePath(parentPath, name, true)
        const arrayNode: FieldNode = {
          id,
          name,
          path,
          type: 'array',
          required,
          children: [],
        }

        // If items is an object with properties, recurse
        if (prop.items.type === 'object' && prop.items.properties) {
          const itemsRequired = new Set<string>((prop.items.required as string[]) || [])
          arrayNode.children = this.extractFields(
            prop.items.properties,
            arrayItemsPath,
            itemsRequired,
            currentDepth + 1,
            maxDepth,
            root
          )
        }

        fields.push(arrayNode)
        continue
      }

      // Handle object type
      if (prop.type === 'object' && prop.properties) {
        const childRequired = new Set<string>((prop.required as string[]) || [])
        const objectNode: FieldNode = {
          id,
          name,
          path,
          type: 'object',
          required,
          children: this.extractFields(
            prop.properties,
            path,
            childRequired,
            currentDepth + 1,
            maxDepth,
            root
          ),
        }
        fields.push(objectNode)
        continue
      }

      // Handle primitive types
      const fieldType = normalizeType(prop.type)
      fields.push({
        id,
        name,
        path,
        type: fieldType,
        required,
        children: [],
      })
    }

    return fields
  }
}
