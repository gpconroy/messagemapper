import { describe, it, expect } from '@jest/globals'
import { JsonSampleParser } from '../json-sample-parser'

describe('JsonSampleParser', () => {
  const parser = new JsonSampleParser()

  describe('parse', () => {
    it('should parse flat object', async () => {
      const sample = JSON.stringify({
        name: 'John',
        age: 30,
        active: true,
      })

      const result = await parser.parse(sample)

      expect(result).toHaveLength(3)

      const nameField = result.find(f => f.name === 'name')
      expect(nameField?.type).toBe('string')
      expect(nameField?.required).toBe(false)

      const ageField = result.find(f => f.name === 'age')
      expect(ageField?.type).toBe('integer')
      expect(ageField?.required).toBe(false)

      const activeField = result.find(f => f.name === 'active')
      expect(activeField?.type).toBe('boolean')
      expect(activeField?.required).toBe(false)
    })

    it('should parse nested object', async () => {
      const sample = JSON.stringify({
        user: {
          name: 'John',
          address: {
            city: 'Dublin',
          },
        },
      })

      const result = await parser.parse(sample)

      expect(result).toHaveLength(1)
      const userField = result[0]
      expect(userField.name).toBe('user')
      expect(userField.type).toBe('object')
      expect(userField.children).toHaveLength(2)

      const nameField = userField.children.find(f => f.name === 'name')
      expect(nameField?.path).toBe('user.name')

      const addressField = userField.children.find(f => f.name === 'address')
      expect(addressField?.path).toBe('user.address')
      expect(addressField?.children).toHaveLength(1)

      const cityField = addressField?.children[0]
      expect(cityField?.name).toBe('city')
      expect(cityField?.path).toBe('user.address.city')
      expect(cityField?.id).toBe('user-address-city')
    })

    it('should parse array of objects', async () => {
      const sample = JSON.stringify({
        items: [
          { id: 1, name: 'Widget' },
        ],
      })

      const result = await parser.parse(sample)

      expect(result).toHaveLength(1)
      const itemsField = result[0]
      expect(itemsField.name).toBe('items')
      expect(itemsField.type).toBe('array')
      expect(itemsField.path).toBe('items')
      expect(itemsField.children).toHaveLength(2)

      const idField = itemsField.children.find(f => f.name === 'id')
      expect(idField?.path).toBe('items[].id')
      expect(idField?.id).toBe('items-array-id')
      expect(idField?.type).toBe('integer')

      const nameField = itemsField.children.find(f => f.name === 'name')
      expect(nameField?.path).toBe('items[].name')
      expect(nameField?.type).toBe('string')
    })

    it('should infer types correctly', async () => {
      const sample = JSON.stringify({
        str: 'hello',
        num: 3.14,
        int: 42,
        bool: false,
        nil: null,
      })

      const result = await parser.parse(sample)

      expect(result.find(f => f.name === 'str')?.type).toBe('string')
      expect(result.find(f => f.name === 'num')?.type).toBe('number')
      expect(result.find(f => f.name === 'int')?.type).toBe('integer')
      expect(result.find(f => f.name === 'bool')?.type).toBe('boolean')
      expect(result.find(f => f.name === 'nil')?.type).toBe('null')
    })

    it('should detect ISO date strings', async () => {
      const sample = JSON.stringify({
        created: '2024-01-15T10:30:00Z',
        birthdate: '2024-01-15',
      })

      const result = await parser.parse(sample)

      expect(result.find(f => f.name === 'created')?.type).toBe('date')
      expect(result.find(f => f.name === 'birthdate')?.type).toBe('date')
    })

    it('should return empty array for empty object', async () => {
      const sample = JSON.stringify({})

      const result = await parser.parse(sample)

      expect(result).toHaveLength(0)
    })

    it('should handle empty array', async () => {
      const sample = JSON.stringify({
        items: [],
      })

      const result = await parser.parse(sample)

      expect(result).toHaveLength(1)
      const itemsField = result[0]
      expect(itemsField.name).toBe('items')
      expect(itemsField.type).toBe('array')
      expect(itemsField.children).toHaveLength(0)
    })

    it('should handle deeply nested structure', async () => {
      const sample = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep',
              },
            },
          },
        },
      })

      const result = await parser.parse(sample)

      let current = result[0]
      expect(current.name).toBe('level1')
      expect(current.path).toBe('level1')

      current = current.children[0]
      expect(current.name).toBe('level2')
      expect(current.path).toBe('level1.level2')

      current = current.children[0]
      expect(current.name).toBe('level3')
      expect(current.path).toBe('level1.level2.level3')

      current = current.children[0]
      expect(current.name).toBe('level4')
      expect(current.path).toBe('level1.level2.level3.level4')

      current = current.children[0]
      expect(current.name).toBe('level5')
      expect(current.path).toBe('level1.level2.level3.level4.level5')
    })
  })

  describe('validate', () => {
    it('should validate valid JSON', async () => {
      const sample = JSON.stringify({ name: 'John', age: 30 })

      const result = await parser.validate(sample)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid JSON', async () => {
      const invalidJson = '{ invalid json }'

      const result = await parser.validate(invalidJson)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  it('should have format property set to json-sample', () => {
    expect(parser.format).toBe('json-sample')
  })
})
