import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { BaseParser, FieldNode, ParseOptions, ParserType, ValidationResult } from '@/types/parser-types'
import { normalizeType, generatePath, generateId } from './normalize'

/**
 * Infers type from primitive value
 */
function inferType(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'any'
  }

  const type = typeof value

  if (type === 'boolean') {
    return 'boolean'
  }

  if (type === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }

  if (type === 'string') {
    // Try to detect dates
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value)) {
      return 'date'
    }

    // Try to detect booleans
    if (value === 'true' || value === 'false') {
      return 'boolean'
    }

    // Try to detect numbers
    if (/^-?\d+$/.test(value)) {
      return 'integer'
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return 'number'
    }

    return 'string'
  }

  return 'any'
}

/**
 * XmlSampleParser - parses XML sample data into FieldNode trees
 * Handles attributes (with @ prefix), nested elements, repeated elements (arrays), and namespaces
 */
export class XmlSampleParser implements BaseParser {
  readonly format: ParserType = 'xml-sample'
  private xmlParser: XMLParser

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false, // Keep attributes as strings for type inference
      parseTagValue: false, // Keep element text content as strings for type inference
      trimValues: true,
      removeNSPrefix: true, // Strip namespace prefixes for clean display names
      // Don't use isArray auto-detection - we'll detect arrays manually
      isArray: () => false,
    })
  }

  async validate(content: string): Promise<ValidationResult> {
    try {
      // Use XMLValidator for strict validation
      const validationResult = XMLValidator.validate(content)

      if (validationResult === true) {
        return { valid: true, errors: [] }
      }

      // validationResult is an error object
      const error = validationResult.err
      const errorMessage = error.msg || 'Invalid XML'

      return {
        valid: false,
        errors: [errorMessage],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown XML parsing error'
      return {
        valid: false,
        errors: [errorMessage],
      }
    }
  }

  async parse(content: string, options?: ParseOptions): Promise<FieldNode[]> {
    const maxDepth = options?.maxDepth ?? 50
    const parsed = this.xmlParser.parse(content)

    // Get root element
    const rootKeys = Object.keys(parsed)
    if (rootKeys.length === 0) {
      return []
    }

    const rootName = rootKeys[0]
    const rootValue = parsed[rootName]

    return [this.buildFieldNode(rootName, rootValue, '', 0, maxDepth)]
  }

  private buildFieldNode(
    name: string,
    value: any,
    parentPath: string,
    depth: number,
    maxDepth: number
  ): FieldNode {
    // Check if we should stop creating children
    const shouldLimitDepth = depth >= maxDepth

    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
      const path = generatePath(parentPath, name)
      return {
        id: generateId(path),
        name,
        path,
        type: 'any',
        required: false,
        children: [],
      }
    }

    // Handle arrays (repeated elements)
    if (Array.isArray(value)) {
      const path = generatePath(parentPath, name)
      const children: FieldNode[] = []

      // Infer structure from first element
      if (value.length > 0) {
        const firstItem = value[0]
        if (typeof firstItem === 'object' && firstItem !== null) {
          children.push(...this.buildChildrenFromObject(firstItem, path + '[]', depth + 1, maxDepth))
        }
      }

      return {
        id: generateId(path),
        name,
        path,
        type: 'array',
        required: false,
        children,
      }
    }

    // Handle objects
    if (typeof value === 'object') {
      const path = generatePath(parentPath, name)
      const children = shouldLimitDepth ? [] : this.buildChildrenFromObject(value, path, depth + 1, maxDepth)

      return {
        id: generateId(path),
        name,
        path,
        type: 'object',
        required: false,
        children,
      }
    }

    // Handle primitives
    const path = generatePath(parentPath, name)
    const inferredType = inferType(value)

    return {
      id: generateId(path),
      name,
      path,
      type: normalizeType(inferredType),
      required: false,
      children: [],
    }
  }

  private buildChildrenFromObject(
    obj: any,
    parentPath: string,
    depth: number,
    maxDepth: number
  ): FieldNode[] {
    const children: FieldNode[] = []

    for (const key of Object.keys(obj)) {
      // Handle attributes
      if (key.startsWith('@_')) {
        const attrName = key.substring(2) // Remove @_ prefix
        const attrValue = obj[key]
        const attrPath = `${parentPath}@${attrName}`
        const inferredType = inferType(attrValue)

        children.push({
          id: generateId(attrPath),
          name: attrName,
          path: attrPath,
          type: normalizeType(inferredType),
          required: false,
          children: [],
        })
        continue
      }

      // Skip #text (text content is the value, not a child)
      if (key === '#text') {
        continue
      }

      // Process regular elements
      const childValue = obj[key]
      // Don't create child nodes if we've reached max depth
      if (depth < maxDepth) {
        children.push(this.buildFieldNode(key, childValue, parentPath, depth, maxDepth))
      }
    }

    return children
  }
}
