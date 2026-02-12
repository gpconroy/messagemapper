import { describe, it, expect } from '@jest/globals'
import type { FieldNode } from '@/types/parser-types'
import { validateMapping, ValidationError, ValidationResult } from '../validate-mapping'

describe('Validate Mapping', () => {
  describe('ValidationError and ValidationResult types', () => {
    it('should define ValidationError structure', () => {
      const error: ValidationError = {
        type: 'missing_required',
        targetField: 'email',
        message: 'Required field email is not mapped',
        severity: 'error'
      }
      expect(error.type).toBe('missing_required')
      expect(error.severity).toBe('error')
    })

    it('should define ValidationResult structure', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [],
        errorCount: 1,
        warningCount: 0
      }
      expect(result.valid).toBe(false)
      expect(result.errorCount).toBe(1)
    })
  })

  describe('validateMapping', () => {
    const simpleSourceSchema: FieldNode[] = [
      {
        id: '1',
        name: 'firstName',
        path: 'firstName',
        type: 'string',
        required: false,
        children: []
      },
      {
        id: '2',
        name: 'age',
        path: 'age',
        type: 'number',
        required: false,
        children: []
      }
    ]

    const simpleTargetSchema: FieldNode[] = [
      {
        id: '1',
        name: 'name',
        path: 'name',
        type: 'string',
        required: true,
        children: []
      },
      {
        id: '2',
        name: 'years',
        path: 'years',
        type: 'integer',
        required: true,
        children: []
      }
    ]

    it('should return valid for empty connections with no required fields', () => {
      const targetSchemaNoRequired: FieldNode[] = [
        {
          id: '1',
          name: 'optional',
          path: 'optional',
          type: 'string',
          required: false,
          children: []
        }
      ]

      const result = validateMapping(simpleSourceSchema, targetSchemaNoRequired, [])
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.errorCount).toBe(0)
      expect(result.warningCount).toBe(0)
    })

    it('should return invalid for empty connections with required fields', () => {
      const result = validateMapping(simpleSourceSchema, simpleTargetSchema, [])
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.type === 'missing_required')).toBe(true)
    })

    it('should return valid for compatible types connected', () => {
      const connections = [
        { sourceFieldPath: 'firstName', targetFieldPath: 'name' },
        { sourceFieldPath: 'age', targetFieldPath: 'years' }
      ]

      const result = validateMapping(simpleSourceSchema, simpleTargetSchema, connections)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should return invalid for incompatible types connected', () => {
      const sourceSchema: FieldNode[] = [
        {
          id: '1',
          name: 'data',
          path: 'data',
          type: 'object',
          required: false,
          children: []
        }
      ]
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'count',
          path: 'count',
          type: 'number',
          required: true,
          children: []
        }
      ]

      const connections = [
        { sourceFieldPath: 'data', targetFieldPath: 'count' }
      ]

      const result = validateMapping(sourceSchema, targetSchema, connections)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'type_mismatch')).toBe(true)
    })

    it('should return valid when transformation fixes type incompatibility', () => {
      const sourceSchema: FieldNode[] = [
        {
          id: '1',
          name: 'price',
          path: 'price',
          type: 'number',
          required: false,
          children: []
        }
      ]
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'formattedPrice',
          path: 'formattedPrice',
          type: 'string',
          required: true,
          children: []
        }
      ]

      const connections = [
        {
          sourceFieldPath: 'price',
          targetFieldPath: 'formattedPrice',
          transformation: {
            type: 'format_number' as const,
            config: { type: 'currency', currency: 'USD' }
          }
        }
      ]

      const result = validateMapping(sourceSchema, targetSchema, connections)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should collect multiple errors not just first', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'field1',
          path: 'field1',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '2',
          name: 'field2',
          path: 'field2',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '3',
          name: 'field3',
          path: 'field3',
          type: 'string',
          required: true,
          children: []
        }
      ]

      const result = validateMapping(simpleSourceSchema, targetSchema, [])
      expect(result.errors.length).toBe(3)
      expect(result.errorCount).toBe(3)
    })

    it('should handle connection format from useMappingStore', () => {
      const connections = [
        {
          sourceFieldPath: 'firstName',
          targetFieldPath: 'name',
          transformation: undefined
        }
      ]

      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'name',
          path: 'name',
          type: 'string',
          required: true,
          children: []
        }
      ]

      const result = validateMapping(simpleSourceSchema, targetSchema, connections)
      expect(result.valid).toBe(true)
    })

    it('should count errors and warnings correctly', () => {
      const result = validateMapping(simpleSourceSchema, simpleTargetSchema, [])
      expect(result.errorCount).toBe(result.errors.filter(e => e.severity === 'error').length)
      expect(result.warningCount).toBe(result.errors.filter(e => e.severity === 'warning').length)
    })

    it('should validate nested field mappings', () => {
      const sourceSchema: FieldNode[] = [
        {
          id: '1',
          name: 'user',
          path: 'user',
          type: 'object',
          required: false,
          children: [
            {
              id: '1.1',
              name: 'firstName',
              path: 'user.firstName',
              type: 'string',
              required: false,
              children: []
            }
          ]
        }
      ]
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'person',
          path: 'person',
          type: 'object',
          required: true,
          children: [
            {
              id: '1.1',
              name: 'name',
              path: 'person.name',
              type: 'string',
              required: true,
              children: []
            }
          ]
        }
      ]

      const connections = [
        { sourceFieldPath: 'user.firstName', targetFieldPath: 'person.name' }
      ]

      const result = validateMapping(sourceSchema, targetSchema, connections)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })
})
