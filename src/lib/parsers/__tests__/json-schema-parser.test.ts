import { describe, it, expect } from '@jest/globals'
import { JsonSchemaParser } from '../json-schema-parser'

describe('JsonSchemaParser', () => {
  const parser = new JsonSchemaParser()

  describe('parse', () => {
    it('should parse simple flat object schema', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        required: ['name'],
      })

      const result = await parser.parse(schema)

      expect(result).toHaveLength(2)

      const nameField = result.find(f => f.name === 'name')
      expect(nameField).toBeDefined()
      expect(nameField?.type).toBe('string')
      expect(nameField?.required).toBe(true)
      expect(nameField?.path).toBe('name')
      expect(nameField?.id).toBe('name')

      const ageField = result.find(f => f.name === 'age')
      expect(ageField).toBeDefined()
      expect(ageField?.type).toBe('integer')
      expect(ageField?.required).toBe(false)
      expect(ageField?.path).toBe('age')
      expect(ageField?.id).toBe('age')
    })

    it('should parse nested object schema', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
      })

      const result = await parser.parse(schema)

      expect(result).toHaveLength(1)
      const addressField = result[0]
      expect(addressField.name).toBe('address')
      expect(addressField.type).toBe('object')
      expect(addressField.children).toHaveLength(2)

      const streetField = addressField.children.find(f => f.name === 'street')
      expect(streetField?.path).toBe('address.street')
      expect(streetField?.id).toBe('address-street')

      const cityField = addressField.children.find(f => f.name === 'city')
      expect(cityField?.path).toBe('address.city')
      expect(cityField?.id).toBe('address-city')
    })

    it('should parse array field schema', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
          },
        },
      })

      const result = await parser.parse(schema)

      expect(result).toHaveLength(1)
      const itemsField = result[0]
      expect(itemsField.name).toBe('items')
      expect(itemsField.type).toBe('array')
      expect(itemsField.path).toBe('items')
      expect(itemsField.children).toHaveLength(2)

      const idField = itemsField.children.find(f => f.name === 'id')
      expect(idField?.path).toBe('items[].id')
      expect(idField?.id).toBe('items-array-id')
    })

    it('should resolve $ref references', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          address: { $ref: '#/$defs/Address' },
        },
        $defs: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
      })

      const result = await parser.parse(schema)

      expect(result).toHaveLength(1)
      const addressField = result[0]
      expect(addressField.name).toBe('address')
      expect(addressField.type).toBe('object')
      expect(addressField.children).toHaveLength(2)
      expect(addressField.children.find(f => f.name === 'street')).toBeDefined()
      expect(addressField.children.find(f => f.name === 'city')).toBeDefined()
    })

    it('should normalize type values correctly', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          str: { type: 'string' },
          num: { type: 'number' },
          int: { type: 'integer' },
          bool: { type: 'boolean' },
          nullable: { type: ['string', 'null'] },
        },
      })

      const result = await parser.parse(schema)

      expect(result.find(f => f.name === 'str')?.type).toBe('string')
      expect(result.find(f => f.name === 'num')?.type).toBe('number')
      expect(result.find(f => f.name === 'int')?.type).toBe('integer')
      expect(result.find(f => f.name === 'bool')?.type).toBe('boolean')
      expect(result.find(f => f.name === 'nullable')?.type).toBe('string')
    })

    it('should return empty array for schema with empty properties', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {},
      })

      const result = await parser.parse(schema)

      expect(result).toHaveLength(0)
    })

    it('should respect maxDepth option', async () => {
      // Create deeply nested schema (10 levels)
      const deepSchema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      level4: {
                        type: 'object',
                        properties: {
                          level5: {
                            type: 'object',
                            properties: {
                              level6: {
                                type: 'object',
                                properties: {
                                  level7: {
                                    type: 'object',
                                    properties: {
                                      level8: {
                                        type: 'object',
                                        properties: {
                                          level9: {
                                            type: 'object',
                                            properties: {
                                              level10: { type: 'string' },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }

      const result = await parser.parse(JSON.stringify(deepSchema), { maxDepth: 3 })

      // Should stop at depth 3
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('level1')
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].name).toBe('level2')
      expect(result[0].children[0].children).toHaveLength(1)
      expect(result[0].children[0].children[0].name).toBe('level3')
      // Should not have level4
      expect(result[0].children[0].children[0].children).toHaveLength(0)
    })
  })

  describe('validate', () => {
    it('should validate valid JSON Schema', async () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      })

      const result = await parser.validate(schema)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid JSON', async () => {
      const invalidJson = '{ invalid json }'

      const result = await parser.validate(invalidJson)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('JSON')
    })

    it('should return errors for non-schema JSON', async () => {
      const notASchema = JSON.stringify('hello')

      const result = await parser.validate(notASchema)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  it('should have format property set to json-schema', () => {
    expect(parser.format).toBe('json-schema')
  })
})
