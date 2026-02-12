/**
 * Built-in Transformation Functions Tests
 *
 * TDD RED phase: All tests written before implementation
 */

import { describe, it, expect } from '@jest/globals';
import { formatDate } from '../builtins/format';
import { formatNumber } from '../builtins/format';
import { splitString } from '../builtins/string';
import { concatenateStrings } from '../builtins/string';
import { applyConditional } from '../builtins/conditional';
import { setConstant } from '../builtins/constant';
import { executeTransform } from '../registry';

describe('formatDate', () => {
  it('formats ISO date to MM/dd/yyyy', () => {
    const result = formatDate('2026-02-12', { to: 'MM/dd/yyyy' });
    expect(result).toBe('02/12/2026');
  });

  it('converts yyyyMMdd format to yyyy-MM-dd', () => {
    const result = formatDate('20260212', { from: 'yyyyMMdd', to: 'yyyy-MM-dd' });
    expect(result).toBe('2026-02-12');
  });

  it('throws error on invalid date input', () => {
    expect(() => formatDate('invalid', { to: 'yyyy' })).toThrow('Invalid date input');
  });

  it('handles dates with time components', () => {
    const result = formatDate('2026-02-12T10:30:00', { to: 'yyyy-MM-dd' });
    expect(result).toBe('2026-02-12');
  });
});

describe('formatNumber', () => {
  it('formats number with locale en-US', () => {
    const result = formatNumber(1234.56, { type: 'number', locale: 'en-US' });
    expect(result).toBe('1,234.56');
  });

  it('formats currency USD', () => {
    const result = formatNumber(1234.56, { type: 'currency', currency: 'USD', locale: 'en-US' });
    expect(result).toBe('$1,234.56');
  });

  it('throws error on non-numeric input', () => {
    expect(() => formatNumber('not-a-number', { type: 'number' })).toThrow();
  });

  it('respects minimumFractionDigits', () => {
    const result = formatNumber(100, { type: 'number', locale: 'en-US', minimumFractionDigits: 2 });
    expect(result).toBe('100.00');
  });

  it('respects maximumFractionDigits', () => {
    const result = formatNumber(1234.56789, { type: 'number', locale: 'en-US', maximumFractionDigits: 2 });
    expect(result).toBe('1,234.57');
  });
});

describe('splitString', () => {
  it('splits by comma delimiter', () => {
    const result = splitString('John,Doe', { delimiter: ',' });
    expect(result).toEqual(['John', 'Doe']);
  });

  it('splits by regex pattern with trim', () => {
    const result = splitString('John, Doe ; Jane', { delimiter: '[,;]', isRegex: true, trim: true });
    expect(result).toEqual(['John', 'Doe', 'Jane']);
  });

  it('returns array with single element when no delimiter found', () => {
    const result = splitString('hello', { delimiter: ',' });
    expect(result).toEqual(['hello']);
  });

  it('handles empty string', () => {
    const result = splitString('', { delimiter: ',' });
    expect(result).toEqual(['']);
  });

  it('throws error on non-string input', () => {
    expect(() => splitString(123, { delimiter: ',' })).toThrow();
  });
});

describe('concatenateStrings', () => {
  it('joins array with space separator', () => {
    const result = concatenateStrings(['John', 'Doe'], { separator: ' ' });
    expect(result).toBe('John Doe');
  });

  it('joins array with trim option', () => {
    const result = concatenateStrings(['  John ', ' Doe  '], { separator: ', ', trim: true });
    expect(result).toBe('John, Doe');
  });

  it('throws error on non-array input', () => {
    expect(() => concatenateStrings('not-array', { separator: ' ' })).toThrow();
  });

  it('handles empty array', () => {
    const result = concatenateStrings([], { separator: ',' });
    expect(result).toBe('');
  });

  it('handles array with single element', () => {
    const result = concatenateStrings(['single'], { separator: ',' });
    expect(result).toBe('single');
  });
});

describe('applyConditional', () => {
  it('returns thenValue when equals operator matches', () => {
    const result = applyConditional('ACTIVE', { operator: 'equals', value: 'ACTIVE', thenValue: true, elseValue: false });
    expect(result).toBe(true);
  });

  it('returns elseValue when equals operator does not match', () => {
    const result = applyConditional('INACTIVE', { operator: 'equals', value: 'ACTIVE', thenValue: true, elseValue: false });
    expect(result).toBe(false);
  });

  it('handles contains operator on string', () => {
    const result = applyConditional('Hello World', { operator: 'contains', value: 'World', thenValue: 'yes', elseValue: 'no' });
    expect(result).toBe('yes');
  });

  it('handles greaterThan operator on numbers', () => {
    const result = applyConditional(100, { operator: 'greaterThan', value: 50, thenValue: 'high', elseValue: 'low' });
    expect(result).toBe('high');
  });

  it('handles lessThan operator on numbers', () => {
    const result = applyConditional(30, { operator: 'lessThan', value: 50, thenValue: 'low', elseValue: 'high' });
    expect(result).toBe('low');
  });

  it('handles notEquals operator', () => {
    const result = applyConditional('foo', { operator: 'notEquals', value: 'bar', thenValue: 'different', elseValue: 'same' });
    expect(result).toBe('different');
  });

  it('handles startsWith operator', () => {
    const result = applyConditional('Hello World', { operator: 'startsWith', value: 'Hello', thenValue: 'yes', elseValue: 'no' });
    expect(result).toBe('yes');
  });

  it('handles endsWith operator', () => {
    const result = applyConditional('Hello World', { operator: 'endsWith', value: 'World', thenValue: 'yes', elseValue: 'no' });
    expect(result).toBe('yes');
  });
});

describe('setConstant', () => {
  it('returns constant value regardless of null input', () => {
    const result = setConstant(null, { value: 'DEFAULT' });
    expect(result).toBe('DEFAULT');
  });

  it('returns constant value regardless of input', () => {
    const result = setConstant('anything', { value: 42 });
    expect(result).toBe(42);
  });

  it('returns null constant if configured', () => {
    const result = setConstant(undefined, { value: null });
    expect(result).toBe(null);
  });

  it('returns object constant', () => {
    const obj = { key: 'value' };
    const result = setConstant('input', { value: obj });
    expect(result).toBe(obj);
  });
});

describe('executeTransform', () => {
  it('dispatches to formatDate transform', () => {
    const result = executeTransform('format_date', '2026-02-12', { to: 'MM/dd/yyyy' });
    expect(result).toBe('02/12/2026');
  });

  it('dispatches to formatNumber transform', () => {
    const result = executeTransform('format_number', 1234.56, { type: 'number', locale: 'en-US' });
    expect(result).toBe('1,234.56');
  });

  it('dispatches to split transform', () => {
    const result = executeTransform('split', 'a,b,c', { delimiter: ',' });
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('dispatches to concatenate transform', () => {
    const result = executeTransform('concatenate', ['a', 'b'], { separator: '-' });
    expect(result).toBe('a-b');
  });

  it('dispatches to conditional transform', () => {
    const result = executeTransform('conditional', 'test', { operator: 'equals', value: 'test', thenValue: 1, elseValue: 0 });
    expect(result).toBe(1);
  });

  it('dispatches to constant transform', () => {
    const result = executeTransform('constant', null, { value: 'fixed' });
    expect(result).toBe('fixed');
  });

  it('throws error on unknown transformation type', () => {
    expect(() => executeTransform('unknown_type' as any, 'x', {})).toThrow('Unknown transformation type: unknown_type');
  });

  it('throws "not yet implemented" for lookup transform', () => {
    expect(() => executeTransform('lookup', 'key', {})).toThrow('not yet implemented');
  });

  it('throws "not yet implemented" for custom_js transform', () => {
    expect(() => executeTransform('custom_js', 'code', {})).toThrow('not yet implemented');
  });
});
