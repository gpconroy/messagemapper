import { describe, it, expect } from '@jest/globals'
import type { FieldType } from '@/types/parser-types'
import { areTypesCompatible, inferTransformationOutputType, TYPE_COMPATIBILITY } from '../type-compatibility'

describe('Type Compatibility Matrix', () => {
  describe('TYPE_COMPATIBILITY', () => {
    it('should define string as most flexible source type', () => {
      expect(TYPE_COMPATIBILITY['string']).toContain('string')
      expect(TYPE_COMPATIBILITY['string']).toContain('number')
      expect(TYPE_COMPATIBILITY['string']).toContain('integer')
      expect(TYPE_COMPATIBILITY['string']).toContain('boolean')
      expect(TYPE_COMPATIBILITY['string']).toContain('date')
      expect(TYPE_COMPATIBILITY['string']).toContain('any')
    })

    it('should define number type conversions', () => {
      expect(TYPE_COMPATIBILITY['number']).toContain('number')
      expect(TYPE_COMPATIBILITY['number']).toContain('integer')
      expect(TYPE_COMPATIBILITY['number']).toContain('string')
      expect(TYPE_COMPATIBILITY['number']).toContain('any')
    })

    it('should define integer type conversions', () => {
      expect(TYPE_COMPATIBILITY['integer']).toContain('integer')
      expect(TYPE_COMPATIBILITY['integer']).toContain('number')
      expect(TYPE_COMPATIBILITY['integer']).toContain('string')
      expect(TYPE_COMPATIBILITY['integer']).toContain('any')
    })

    it('should define boolean type conversions', () => {
      expect(TYPE_COMPATIBILITY['boolean']).toContain('boolean')
      expect(TYPE_COMPATIBILITY['boolean']).toContain('string')
      expect(TYPE_COMPATIBILITY['boolean']).toContain('number')
      expect(TYPE_COMPATIBILITY['boolean']).toContain('integer')
      expect(TYPE_COMPATIBILITY['boolean']).toContain('any')
    })

    it('should define date type conversions', () => {
      expect(TYPE_COMPATIBILITY['date']).toContain('date')
      expect(TYPE_COMPATIBILITY['date']).toContain('string')
      expect(TYPE_COMPATIBILITY['date']).toContain('number')
      expect(TYPE_COMPATIBILITY['date']).toContain('any')
    })

    it('should define object type conversions', () => {
      expect(TYPE_COMPATIBILITY['object']).toContain('object')
      expect(TYPE_COMPATIBILITY['object']).toContain('string')
      expect(TYPE_COMPATIBILITY['object']).toContain('any')
    })

    it('should define array type conversions', () => {
      expect(TYPE_COMPATIBILITY['array']).toContain('array')
      expect(TYPE_COMPATIBILITY['array']).toContain('string')
      expect(TYPE_COMPATIBILITY['array']).toContain('any')
    })

    it('should define null type as not convertible except to any', () => {
      expect(TYPE_COMPATIBILITY['null']).toContain('any')
      expect(TYPE_COMPATIBILITY['null'].length).toBe(1)
    })

    it('should define any as compatible with all types', () => {
      const allTypes: FieldType[] = ['string', 'number', 'integer', 'boolean', 'date', 'object', 'array', 'null', 'any']
      allTypes.forEach(type => {
        expect(TYPE_COMPATIBILITY['any']).toContain(type)
      })
    })
  })

  describe('areTypesCompatible', () => {
    it('should return true for exact type matches', () => {
      expect(areTypesCompatible('string', 'string')).toBe(true)
      expect(areTypesCompatible('number', 'number')).toBe(true)
      expect(areTypesCompatible('boolean', 'boolean')).toBe(true)
    })

    it('should return true for string to number conversion', () => {
      expect(areTypesCompatible('string', 'number')).toBe(true)
    })

    it('should return false for object to number conversion', () => {
      expect(areTypesCompatible('object', 'number')).toBe(false)
    })

    it('should return true for any type source', () => {
      expect(areTypesCompatible('any', 'boolean')).toBe(true)
      expect(areTypesCompatible('any', 'string')).toBe(true)
    })

    it('should return true for any type target', () => {
      expect(areTypesCompatible('string', 'any')).toBe(true)
      expect(areTypesCompatible('object', 'any')).toBe(true)
    })

    it('should return false for null to string conversion', () => {
      expect(areTypesCompatible('null', 'string')).toBe(false)
    })

    it('should return true for null to any conversion', () => {
      expect(areTypesCompatible('null', 'any')).toBe(true)
    })
  })

  describe('inferTransformationOutputType', () => {
    it('should return input type when no transformations', () => {
      expect(inferTransformationOutputType('string', [])).toBe('string')
      expect(inferTransformationOutputType('number', [])).toBe('number')
    })

    it('should infer string output for format_date transformation', () => {
      expect(inferTransformationOutputType('string', [{ type: 'format_date' }])).toBe('string')
      expect(inferTransformationOutputType('date', [{ type: 'format_date' }])).toBe('string')
    })

    it('should infer array output for split transformation', () => {
      expect(inferTransformationOutputType('string', [{ type: 'split' }])).toBe('array')
    })

    it('should infer string output for format_number transformation', () => {
      expect(inferTransformationOutputType('number', [{ type: 'format_number' }])).toBe('string')
    })

    it('should infer string output for concatenate transformation', () => {
      expect(inferTransformationOutputType('string', [{ type: 'concatenate' }])).toBe('string')
    })

    it('should infer any output for conditional transformation', () => {
      expect(inferTransformationOutputType('any', [{ type: 'conditional' }])).toBe('any')
    })

    it('should infer type from constant value - number', () => {
      expect(inferTransformationOutputType('string', [{ type: 'constant', config: { value: 42 } }])).toBe('number')
    })

    it('should infer type from constant value - boolean', () => {
      expect(inferTransformationOutputType('string', [{ type: 'constant', config: { value: true } }])).toBe('boolean')
    })

    it('should infer string output for lookup transformation', () => {
      expect(inferTransformationOutputType('string', [{ type: 'lookup' }])).toBe('string')
    })

    it('should infer any output for custom_js transformation', () => {
      expect(inferTransformationOutputType('string', [{ type: 'custom_js' }])).toBe('any')
    })

    it('should infer string output for direct transformation', () => {
      expect(inferTransformationOutputType('string', [{ type: 'direct' }])).toBe('string')
      expect(inferTransformationOutputType('number', [{ type: 'direct' }])).toBe('number')
    })

    it('should chain transformations - format_number then split', () => {
      expect(inferTransformationOutputType('number', [
        { type: 'format_number' },
        { type: 'split' }
      ])).toBe('array')
    })

    it('should chain transformations - split then concatenate', () => {
      expect(inferTransformationOutputType('string', [
        { type: 'split' },
        { type: 'concatenate' }
      ])).toBe('string')
    })
  })
})
