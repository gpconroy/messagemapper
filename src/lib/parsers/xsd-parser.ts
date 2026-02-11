import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { BaseParser, FieldNode, ParseOptions, ParserType, ValidationResult } from '@/types/parser-types'
import { normalizeType, generatePath, generateId } from './normalize'

/**
 * XsdParser - parses XSD schema files into FieldNode trees
 * Handles xs:element, xs:complexType (inline and named), xs:sequence, xs:choice, xs:all, xs:attribute
 * Type mapping normalizes all XSD types to canonical FieldType
 */
export class XsdParser implements BaseParser {
  readonly format: ParserType = 'xsd'
  private xmlParser: XMLParser

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true, // Strip xs: prefix for easier traversal
      parseAttributeValue: false, // Keep attribute values as strings
      isArray: () => false, // We'll handle arrays ourselves
    })
  }

  async validate(content: string): Promise<ValidationResult> {
    try {
      // Use XMLValidator for strict validation
      const validationResult = XMLValidator.validate(content)

      if (validationResult !== true) {
        const error = validationResult.err
        const errorMessage = error.msg || 'Invalid XML'
        return {
          valid: false,
          errors: [errorMessage],
        }
      }

      // Parse to check if it's actually XSD
      const parsed = this.xmlParser.parse(content)
      const rootKeys = Object.keys(parsed)

      if (rootKeys.length === 0) {
        return {
          valid: false,
          errors: ['Empty document'],
        }
      }

      // Check if root element is 'schema' (namespace prefix already removed)
      const rootName = rootKeys[0]
      if (rootName !== 'schema') {
        return {
          valid: false,
          errors: ['Not a valid XSD schema'],
        }
      }

      return { valid: true, errors: [] }
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

    // Get schema root
    const schema = parsed.schema
    if (!schema) {
      return []
    }

    // Build map of named complex types for later resolution
    const namedTypes = new Map<string, any>()
    if (schema.complexType) {
      const complexTypes = Array.isArray(schema.complexType) ? schema.complexType : [schema.complexType]
      for (const ct of complexTypes) {
        if (ct['@_name']) {
          namedTypes.set(ct['@_name'], ct)
        }
      }
    }

    // Find root elements
    const elements = schema.element
    if (!elements) {
      return []
    }

    const rootElements = Array.isArray(elements) ? elements : [elements]
    const result: FieldNode[] = []

    for (const element of rootElements) {
      const node = this.buildFieldNodeFromElement(element, '', 0, maxDepth, namedTypes)
      if (node) {
        result.push(node)
      }
    }

    return result
  }

  private buildFieldNodeFromElement(
    element: any,
    parentPath: string,
    depth: number,
    maxDepth: number,
    namedTypes: Map<string, any>
  ): FieldNode | null {
    if (!element || !element['@_name']) {
      return null
    }

    const name = element['@_name']
    const path = generatePath(parentPath, name)

    // Check for maxOccurs="unbounded" to detect arrays
    const isArray = element['@_maxOccurs'] === 'unbounded'

    // Check minOccurs for required flag
    const minOccurs = element['@_minOccurs']
    const required = minOccurs === undefined || minOccurs === '1'

    // Check if we've reached max depth
    if (depth >= maxDepth) {
      return {
        id: generateId(isArray ? path : path),
        name,
        path: isArray ? path : path,
        type: isArray ? 'array' : 'object',
        required,
        children: [],
      }
    }

    // Get type
    const elementType = element['@_type']

    // If it has a built-in type (xs:string, xs:int, etc.)
    if (elementType) {
      // Check if it's a named complex type
      if (namedTypes.has(elementType)) {
        const complexType = namedTypes.get(elementType)!
        const children = this.extractChildrenFromComplexType(
          complexType,
          isArray ? path + '[]' : path,
          depth + 1,
          maxDepth,
          namedTypes,
          false // Not in choice
        )

        return {
          id: generateId(path),
          name,
          path,
          type: isArray ? 'array' : 'object',
          required,
          children,
        }
      }

      // Built-in XSD type
      return {
        id: generateId(path),
        name,
        path,
        type: normalizeType(elementType),
        required,
        children: [],
      }
    }

    // Check for inline complexType
    if (element.complexType) {
      const children = this.extractChildrenFromComplexType(
        element.complexType,
        isArray ? path + '[]' : path,
        depth + 1,
        maxDepth,
        namedTypes,
        false
      )

      return {
        id: generateId(path),
        name,
        path,
        type: isArray ? 'array' : 'object',
        required,
        children,
      }
    }

    // No type specified - treat as any
    return {
      id: generateId(path),
      name,
      path,
      type: 'any',
      required,
      children: [],
    }
  }

  private extractChildrenFromComplexType(
    complexType: any,
    parentPath: string,
    depth: number,
    maxDepth: number,
    namedTypes: Map<string, any>,
    inChoice: boolean
  ): FieldNode[] {
    const children: FieldNode[] = []

    // Check if we've reached max depth
    if (depth >= maxDepth) {
      return []
    }

    // Handle xs:sequence
    if (complexType.sequence) {
      const elements = this.extractElementsFromCompositor(complexType.sequence)
      for (const element of elements) {
        const node = this.buildFieldNodeFromElement(element, parentPath, depth, maxDepth, namedTypes)
        if (node) {
          children.push(node)
        }
      }
    }

    // Handle xs:choice - all elements in choice are optional
    if (complexType.choice) {
      const elements = this.extractElementsFromCompositor(complexType.choice)
      for (const element of elements) {
        const node = this.buildFieldNodeFromElement(element, parentPath, depth, maxDepth, namedTypes)
        if (node) {
          // Mark as optional since it's in a choice
          node.required = false
          children.push(node)
        }
      }
    }

    // Handle xs:all
    if (complexType.all) {
      const elements = this.extractElementsFromCompositor(complexType.all)
      for (const element of elements) {
        const node = this.buildFieldNodeFromElement(element, parentPath, depth, maxDepth, namedTypes)
        if (node) {
          children.push(node)
        }
      }
    }

    // Handle xs:attribute
    if (complexType.attribute) {
      const attributes = Array.isArray(complexType.attribute) ? complexType.attribute : [complexType.attribute]
      for (const attr of attributes) {
        if (attr['@_name']) {
          const attrName = attr['@_name']
          const attrType = attr['@_type'] || 'xs:string'
          const attrPath = `${parentPath}@${attrName}`
          const attrRequired = attr['@_use'] === 'required'

          children.push({
            id: generateId(attrPath),
            name: attrName,
            path: attrPath,
            type: normalizeType(attrType),
            required: attrRequired,
            children: [],
          })
        }
      }
    }

    return children
  }

  private extractElementsFromCompositor(compositor: any): any[] {
    if (!compositor || !compositor.element) {
      return []
    }

    return Array.isArray(compositor.element) ? compositor.element : [compositor.element]
  }
}
