/**
 * Transformation Rule Validation
 *
 * Zod schemas for validating transformation rules before execution.
 */

import { z } from 'zod';
import type { TransformationRule } from './types';

/**
 * Base transformation rule schema
 */
export const TransformationRuleSchema = z.object({
  id: z.string(),
  type: z.enum([
    'format_date',
    'format_number',
    'split',
    'concatenate',
    'conditional',
    'lookup',
    'constant',
    'custom_js',
  ]),
  sourceFields: z.array(z.string()).min(1),
  targetField: z.string(),
  config: z.record(z.string(), z.unknown()),
  order: z.number().int().min(0),
});

/**
 * Date format configuration schema
 */
export const DateFormatConfigSchema = z.object({
  from: z.string().optional(),
  to: z.string(),
});

/**
 * Number format configuration schema
 */
export const NumberFormatConfigSchema = z.object({
  type: z.enum(['number', 'currency']),
  currency: z.string().optional(),
  locale: z.string().optional(),
  minimumFractionDigits: z.number().int().min(0).optional(),
  maximumFractionDigits: z.number().int().min(0).optional(),
});

/**
 * Split configuration schema
 */
export const SplitConfigSchema = z.object({
  delimiter: z.string(),
  isRegex: z.boolean().optional(),
  trim: z.boolean().optional(),
});

/**
 * Concatenate configuration schema
 */
export const ConcatenateConfigSchema = z.object({
  separator: z.string(),
  trim: z.boolean().optional(),
});

/**
 * Conditional configuration schema
 */
export const ConditionalConfigSchema = z.object({
  operator: z.enum([
    'equals',
    'notEquals',
    'contains',
    'startsWith',
    'endsWith',
    'greaterThan',
    'lessThan',
  ]),
  value: z.unknown(),
  thenValue: z.unknown(),
  elseValue: z.unknown(),
});

/**
 * Constant configuration schema
 */
export const ConstantConfigSchema = z.object({
  value: z.unknown(),
});

/**
 * Lookup configuration schema
 */
export const LookupConfigSchema = z.object({
  tableName: z.string(),
  defaultValue: z.unknown().optional(),
});

/**
 * Custom JS configuration schema
 */
export const CustomJSConfigSchema = z.object({
  code: z.string(),
  timeout: z.number().int().min(0).optional(),
  memoryLimit: z.number().int().min(0).optional(),
});

/**
 * Config schema map by type
 */
const configSchemaMap = {
  format_date: DateFormatConfigSchema,
  format_number: NumberFormatConfigSchema,
  split: SplitConfigSchema,
  concatenate: ConcatenateConfigSchema,
  conditional: ConditionalConfigSchema,
  constant: ConstantConfigSchema,
  lookup: LookupConfigSchema,
  custom_js: CustomJSConfigSchema,
};

/**
 * Validate transformation rules
 *
 * @param rules - Array of rules to validate
 * @returns Validation result with typed rules or errors
 */
export function validateTransformationRules(rules: unknown[]): {
  valid: boolean;
  rules?: TransformationRule[];
  errors?: string[];
} {
  const errors: string[] = [];
  const validatedRules: TransformationRule[] = [];

  // Validate each rule structure
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const parseResult = TransformationRuleSchema.safeParse(rule);

    if (!parseResult.success) {
      errors.push(
        `Rule ${i}: ${parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
      continue;
    }

    const validatedRule = parseResult.data;

    // Validate type-specific config
    const configSchema = configSchemaMap[validatedRule.type];
    const configResult = configSchema.safeParse(validatedRule.config);

    if (!configResult.success) {
      errors.push(
        `Rule ${i} (${validatedRule.type}): Invalid config - ${configResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
      continue;
    }

    validatedRules.push(validatedRule as TransformationRule);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, rules: validatedRules };
}
