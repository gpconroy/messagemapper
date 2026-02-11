import type { BaseParser, ParserType, ParseOptions, ParserResult } from '@/types/parser-types'

export class ParserRegistry {
  private parsers = new Map<ParserType, BaseParser>()

  /**
   * Register a parser for a specific format type
   */
  register(type: ParserType, parser: BaseParser): void {
    this.parsers.set(type, parser)
  }

  /**
   * Get parser for a specific format type
   * @throws Error if parser not found
   */
  getParser(type: ParserType): BaseParser {
    const parser = this.parsers.get(type)
    if (!parser) {
      throw new Error(`No parser registered for format type: ${type}`)
    }
    return parser
  }

  /**
   * Check if parser exists for a format type
   */
  hasParser(type: ParserType): boolean {
    return this.parsers.has(type)
  }

  /**
   * Detect format type from content and filename
   * @throws Error if format cannot be detected
   */
  detectFormat(content: string, filename: string): ParserType {
    // File extension detection
    if (filename.endsWith('.xsd')) {
      return 'xsd'
    }
    if (filename.endsWith('.xml')) {
      return 'xml-sample'
    }

    // JSON detection
    if (filename.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content)

        // Check for JSON Schema indicators
        if (parsed.$schema || (parsed.type && parsed.properties)) {
          return 'json-schema'
        }

        // Default to sample if it's plain JSON
        return 'json-sample'
      } catch {
        throw new Error('Invalid JSON content')
      }
    }

    // Unknown format
    const ext = filename.split('.').pop() || 'unknown'
    throw new Error(`Unsupported file format: ${ext}`)
  }

  /**
   * Parse file content with automatic format detection
   */
  async parseFile(content: string, filename: string, options?: ParseOptions): Promise<ParserResult> {
    try {
      // Detect format
      const parserType = this.detectFormat(content, filename)

      // Get parser
      const parser = this.getParser(parserType)

      // Validate first
      const validation = await parser.validate(content)
      if (!validation.valid) {
        return {
          success: false,
          fieldNodes: [],
          errors: validation.errors,
          parserType,
        }
      }

      // Parse
      const fieldNodes = await parser.parse(content, options)

      return {
        success: true,
        fieldNodes,
        errors: [],
        parserType,
      }
    } catch (error) {
      return {
        success: false,
        fieldNodes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        parserType: 'json-sample', // Default fallback
      }
    }
  }
}

// Export singleton instance
export const parserRegistry = new ParserRegistry()
