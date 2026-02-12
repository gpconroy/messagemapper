import { describe, it, expect } from '@jest/globals'
import type { FieldNode } from '@/types/parser-types'
import { validateRequiredFields } from '../required-fields'

describe('Required Field Validation', () => {
  describe('validateRequiredFields', () => {
    it('should return empty errors when all required fields are mapped', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'firstName',
          path: 'firstName',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '2',
          name: 'lastName',
          path: 'lastName',
          type: 'string',
          required: true,
          children: []
        }
      ]
      const mappedPaths = new Set(['firstName', 'lastName'])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toEqual([])
    })

    it('should return error for unmapped required field', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'email',
          path: 'email',
          type: 'string',
          required: true,
          children: []
        }
      ]
      const mappedPaths = new Set<string>([])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatchObject({
        type: 'missing_required',
        targetField: 'email',
        severity: 'error'
      })
    })

    it('should not return error for unmapped optional field', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'middleName',
          path: 'middleName',
          type: 'string',
          required: false,
          children: []
        }
      ]
      const mappedPaths = new Set<string>([])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toEqual([])
    })

    it('should check nested required fields', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'address',
          path: 'address',
          type: 'object',
          required: true,
          children: [
            {
              id: '1.1',
              name: 'street',
              path: 'address.street',
              type: 'string',
              required: true,
              children: []
            },
            {
              id: '1.2',
              name: 'city',
              path: 'address.city',
              type: 'string',
              required: true,
              children: []
            }
          ]
        }
      ]
      const mappedPaths = new Set(['address.street'])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toMatchObject({
        type: 'missing_required',
        targetField: 'address.city'
      })
    })

    it('should return multiple errors for multiple unmapped required fields', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'firstName',
          path: 'firstName',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '2',
          name: 'lastName',
          path: 'lastName',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '3',
          name: 'email',
          path: 'email',
          type: 'string',
          required: true,
          children: []
        }
      ]
      const mappedPaths = new Set(['firstName'])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toHaveLength(2)
      expect(errors.map(e => e.targetField)).toContain('lastName')
      expect(errors.map(e => e.targetField)).toContain('email')
    })

    it('should handle mix of mapped and unmapped required fields', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'id',
          path: 'id',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '2',
          name: 'name',
          path: 'name',
          type: 'string',
          required: true,
          children: []
        },
        {
          id: '3',
          name: 'description',
          path: 'description',
          type: 'string',
          required: false,
          children: []
        }
      ]
      const mappedPaths = new Set(['id'])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toHaveLength(1)
      expect(errors[0].targetField).toBe('name')
    })

    it('should only check leaf fields not parent objects', () => {
      const targetSchema: FieldNode[] = [
        {
          id: '1',
          name: 'user',
          path: 'user',
          type: 'object',
          required: true,
          children: [
            {
              id: '1.1',
              name: 'id',
              path: 'user.id',
              type: 'string',
              required: true,
              children: []
            }
          ]
        }
      ]
      const mappedPaths = new Set(['user.id'])

      const errors = validateRequiredFields(targetSchema, mappedPaths)
      expect(errors).toEqual([])
    })
  })
})
