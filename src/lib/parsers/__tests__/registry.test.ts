import { describe, it, expect, beforeEach } from '@jest/globals'
import { ParserRegistry } from '../registry'
import type { BaseParser, FieldNode, ValidationResult } from '@/types/parser-types'

// Mock parser for testing
class MockParser implements BaseParser {
  readonly format = 'json-schema' as const

  async parse(): Promise<FieldNode[]> {
    return []
  }

  async validate(): Promise<ValidationResult> {
    return { valid: true, errors: [] }
  }
}

describe('ParserRegistry', () => {
  let registry: ParserRegistry

  beforeEach(() => {
    registry = new ParserRegistry()
  })

  it('should register and retrieve a parser', () => {
    const mockParser = new MockParser()
    registry.register('json-schema', mockParser)

    const retrieved = registry.getParser('json-schema')
    expect(retrieved).toBe(mockParser)
  })

  it('should throw when getting unregistered parser', () => {
    expect(() => registry.getParser('json-schema')).toThrow('No parser registered for format type: json-schema')
  })

  it('should return true for registered parser with hasParser', () => {
    const mockParser = new MockParser()
    registry.register('json-schema', mockParser)

    expect(registry.hasParser('json-schema')).toBe(true)
  })

  it('should return false for unregistered parser with hasParser', () => {
    expect(registry.hasParser('json-schema')).toBe(false)
  })

  it('should detect json-schema format from $schema property', () => {
    const content = JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' })
    const format = registry.detectFormat(content, 'test.json')
    expect(format).toBe('json-schema')
  })

  it('should detect json-schema format from type and properties', () => {
    const content = JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } })
    const format = registry.detectFormat(content, 'test.json')
    expect(format).toBe('json-schema')
  })

  it('should detect json-sample format for plain JSON object', () => {
    const content = JSON.stringify({ name: 'John', age: 30 })
    const format = registry.detectFormat(content, 'test.json')
    expect(format).toBe('json-sample')
  })

  it('should detect xml-sample format for .xml filename', () => {
    const content = '<root><item>test</item></root>'
    const format = registry.detectFormat(content, 'test.xml')
    expect(format).toBe('xml-sample')
  })

  it('should detect xsd format for .xsd filename', () => {
    const content = '<xs:schema></xs:schema>'
    const format = registry.detectFormat(content, 'test.xsd')
    expect(format).toBe('xsd')
  })

  it('should throw for unknown file extension', () => {
    const content = 'some content'
    expect(() => registry.detectFormat(content, 'test.txt')).toThrow('Unsupported file format: txt')
  })
})
