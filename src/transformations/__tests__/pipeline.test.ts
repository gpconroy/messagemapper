/**
 * Transformation Pipeline Tests
 *
 * Tests for pipeline execution, validation, error collection, dry-run mode,
 * and rule ordering.
 */

import { applyTransformations } from '../pipeline';
import { validateTransformationRules } from '../validator';
import type { TransformationRule } from '../types';

// Mock Prisma for lookup tests
const mockPrisma = {
  lookupTableEntry: {
    findFirst: jest.fn(),
  },
} as any;

describe('Pipeline Validation', () => {
  it('should reject invalid rules with validation errors', async () => {
    const invalidRules = [
      {
        id: 'r1',
        type: 'invalid_type', // Invalid type
        sourceFields: ['source'],
        targetField: 'target',
        config: {},
        order: 0,
      },
    ];

    const result = await applyTransformations({}, invalidRules);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0]).toContain('type');
  });

  it('should reject rules with empty sourceFields', async () => {
    const invalidRules = [
      {
        id: 'r1',
        type: 'constant',
        sourceFields: [], // Empty array
        targetField: 'target',
        config: { value: 'test' },
        order: 0,
      },
    ];

    const result = await applyTransformations({}, invalidRules);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject rules with invalid type-specific config', async () => {
    const invalidRules = [
      {
        id: 'r1',
        type: 'format_date',
        sourceFields: ['date'],
        targetField: 'formatted',
        config: { missing: 'to' }, // Missing required 'to' field
        order: 0,
      },
    ];

    const result = await applyTransformations({}, invalidRules);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0]).toContain('to');
  });
});

describe('Pipeline Execution', () => {
  it('should execute multiple chained rules in order', async () => {
    const data = {
      orderDate: '2024-01-15',
      firstName: 'John',
      lastName: 'Doe',
      amount: 100,
    };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'format_date',
        sourceFields: ['orderDate'],
        targetField: 'formattedDate',
        config: { to: 'yyyy-MM-dd' },
        order: 0,
      },
      {
        id: 'r2',
        type: 'concatenate',
        sourceFields: ['firstName', 'lastName'],
        targetField: 'fullName',
        config: { separator: ' ' },
        order: 1,
      },
      {
        id: 'r3',
        type: 'conditional',
        sourceFields: ['amount'],
        targetField: 'status',
        config: {
          operator: 'greaterThan',
          value: 50,
          thenValue: 'HIGH',
          elseValue: 'LOW',
        },
        order: 2,
      },
    ];

    const result = await applyTransformations(data, rules);

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result!.formattedDate).toBe('2024-01-15');
    expect(result.result!.fullName).toBe('John Doe');
    expect(result.result!.status).toBe('HIGH');
    expect(result.ruleResults).toHaveLength(3);
    expect(result.ruleResults![0].success).toBe(true);
    expect(result.ruleResults![1].success).toBe(true);
    expect(result.ruleResults![2].success).toBe(true);
  });

  it('should sort rules by order field before execution', async () => {
    const data = { value: 10 };

    // Rules provided out of order
    const rules: TransformationRule[] = [
      {
        id: 'r3',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'third',
        config: { value: 'THIRD' },
        order: 2,
      },
      {
        id: 'r1',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'first',
        config: { value: 'FIRST' },
        order: 0,
      },
      {
        id: 'r2',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'second',
        config: { value: 'SECOND' },
        order: 1,
      },
    ];

    const result = await applyTransformations(data, rules);

    expect(result.success).toBe(true);
    expect(result.ruleResults).toBeDefined();
    // Check execution order via ruleResults
    expect(result.ruleResults![0].ruleId).toBe('r1');
    expect(result.ruleResults![1].ruleId).toBe('r2');
    expect(result.ruleResults![2].ruleId).toBe('r3');
  });

  it('should use single field value directly for single sourceField', async () => {
    const data = { amount: 100 };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'format_number',
        sourceFields: ['amount'],
        targetField: 'formatted',
        config: { type: 'number', minimumFractionDigits: 2 },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules);

    expect(result.success).toBe(true);
    expect(result.result!.formatted).toContain('100');
  });

  it('should create array for multiple sourceFields', async () => {
    const data = { first: 'A', second: 'B', third: 'C' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'concatenate',
        sourceFields: ['first', 'second', 'third'],
        targetField: 'joined',
        config: { separator: '-' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules);

    expect(result.success).toBe(true);
    expect(result.result!.joined).toBe('A-B-C');
  });
});

describe('Error Collection', () => {
  it('should collect errors from failed rules but continue execution', async () => {
    const data = { good: 'value', bad: null };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'first',
        config: { value: 'SUCCESS' },
        order: 0,
      },
      {
        id: 'r2',
        type: 'format_date',
        sourceFields: ['bad'],
        targetField: 'willFail',
        config: { to: 'yyyy-MM-dd' },
        order: 1,
      },
      {
        id: 'r3',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'third',
        config: { value: 'ALSO_SUCCESS' },
        order: 2,
      },
    ];

    const result = await applyTransformations(data, rules);

    expect(result.success).toBe(false); // One rule failed
    expect(result.errors).toBeDefined();
    expect(result.errors!).toHaveLength(1);
    expect(result.errors![0]).toContain('r2');
    expect(result.ruleResults).toHaveLength(3);
    expect(result.ruleResults![0].success).toBe(true);
    expect(result.ruleResults![1].success).toBe(false);
    expect(result.ruleResults![2].success).toBe(true);
    // Successful rules still applied
    expect(result.result!.first).toBe('SUCCESS');
    expect(result.result!.third).toBe('ALSO_SUCCESS');
  });

  it('should provide descriptive error messages', async () => {
    const data = { value: 'text' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'format_number',
        sourceFields: ['value'],
        targetField: 'number',
        config: { type: 'number' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules);

    expect(result.success).toBe(false);
    expect(result.errors![0]).toContain('r1');
    expect(result.ruleResults![0].error).toBeDefined();
  });
});

describe('Dry Run Mode', () => {
  it('should not mutate original data in dry run mode', async () => {
    const data = { original: 'value' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'newField',
        config: { value: 'NEW' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules, undefined, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ original: 'value' }); // Original unchanged
    expect(result.result!.newField).toBeUndefined();
    expect(result.ruleResults![0].success).toBe(true);
    expect(result.ruleResults![0].output).toBe('NEW'); // But output is recorded
  });

  it('should still validate and collect errors in dry run mode', async () => {
    const data = { value: 'bad' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'format_date',
        sourceFields: ['value'],
        targetField: 'date',
        config: { to: 'yyyy-MM-dd' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules, undefined, { dryRun: true });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.ruleResults![0].success).toBe(false);
  });
});

describe('Lookup Transform Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call Prisma for lookup resolution', async () => {
    mockPrisma.lookupTableEntry.findFirst.mockResolvedValue({
      fromValue: 'USD',
      toValue: 'US Dollar',
    });

    const data = { currency: 'USD' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'lookup',
        sourceFields: ['currency'],
        targetField: 'currencyName',
        config: { tableName: 'currencies' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules, { prisma: mockPrisma });

    expect(result.success).toBe(true);
    expect(result.result!.currencyName).toBe('US Dollar');
    expect(mockPrisma.lookupTableEntry.findFirst).toHaveBeenCalledWith({
      where: {
        lookupTable: { name: 'currencies' },
        fromValue: 'USD',
      },
    });
  });

  it('should use default value if lookup not found', async () => {
    mockPrisma.lookupTableEntry.findFirst.mockResolvedValue(null);

    const data = { code: 'UNKNOWN' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'lookup',
        sourceFields: ['code'],
        targetField: 'name',
        config: { tableName: 'codes', defaultValue: 'N/A' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules, { prisma: mockPrisma });

    expect(result.success).toBe(true);
    expect(result.result!.name).toBe('N/A');
  });

  it('should error if lookup not found and no default', async () => {
    mockPrisma.lookupTableEntry.findFirst.mockResolvedValue(null);

    const data = { code: 'UNKNOWN' };

    const rules: TransformationRule[] = [
      {
        id: 'r1',
        type: 'lookup',
        sourceFields: ['code'],
        targetField: 'name',
        config: { tableName: 'codes' },
        order: 0,
      },
    ];

    const result = await applyTransformations(data, rules, { prisma: mockPrisma });

    expect(result.success).toBe(false);
    expect(result.errors![0]).toContain('No lookup entry found');
  });
});

describe('Validator Direct Tests', () => {
  it('should validate correct rules', () => {
    const rules = [
      {
        id: 'r1',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'status',
        config: { value: 'ACTIVE' },
        order: 0,
      },
    ];

    const result = validateTransformationRules(rules);

    expect(result.valid).toBe(true);
    expect(result.rules).toHaveLength(1);
    expect(result.errors).toBeUndefined();
  });

  it('should validate all 8 transformation types', () => {
    const rules = [
      {
        id: 'r1',
        type: 'format_date',
        sourceFields: ['date'],
        targetField: 'formatted',
        config: { to: 'yyyy-MM-dd' },
        order: 0,
      },
      {
        id: 'r2',
        type: 'format_number',
        sourceFields: ['num'],
        targetField: 'formatted',
        config: { type: 'number' },
        order: 1,
      },
      {
        id: 'r3',
        type: 'split',
        sourceFields: ['text'],
        targetField: 'parts',
        config: { delimiter: ',' },
        order: 2,
      },
      {
        id: 'r4',
        type: 'concatenate',
        sourceFields: ['a', 'b'],
        targetField: 'joined',
        config: { separator: ' ' },
        order: 3,
      },
      {
        id: 'r5',
        type: 'conditional',
        sourceFields: ['val'],
        targetField: 'result',
        config: { operator: 'equals', value: 1, thenValue: 'yes', elseValue: 'no' },
        order: 4,
      },
      {
        id: 'r6',
        type: 'constant',
        sourceFields: ['_'],
        targetField: 'const',
        config: { value: 'test' },
        order: 5,
      },
      {
        id: 'r7',
        type: 'lookup',
        sourceFields: ['code'],
        targetField: 'name',
        config: { tableName: 'table1' },
        order: 6,
      },
      {
        id: 'r8',
        type: 'custom_js',
        sourceFields: ['input'],
        targetField: 'output',
        config: { code: 'return input * 2' },
        order: 7,
      },
    ];

    const result = validateTransformationRules(rules);

    expect(result.valid).toBe(true);
    expect(result.rules).toHaveLength(8);
  });
});
