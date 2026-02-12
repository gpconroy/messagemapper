/**
 * Transformation Type System
 *
 * Defines all transformation types, function signatures, and configuration interfaces
 * for the transformation pipeline.
 */

/**
 * All supported transformation types
 */
export type TransformationType =
  | 'direct'
  | 'format_date'
  | 'format_number'
  | 'split'
  | 'concatenate'
  | 'conditional'
  | 'lookup'
  | 'constant'
  | 'custom_js';

/**
 * Transform function signature - all transforms must implement this interface
 */
export type TransformFunction = (
  input: unknown,
  config: Record<string, unknown>,
  context?: { prisma?: unknown }
) => unknown | Promise<unknown>;

/**
 * Transformation rule configuration
 */
export interface TransformationRule {
  id: string;
  type: TransformationType;
  sourceFields: string[];
  targetField: string;
  config: Record<string, unknown>;
  order: number;
}

/**
 * Date formatting configuration
 */
export interface DateFormatConfig {
  from?: string; // Source format (default: ISO 8601)
  to: string;    // Target format
}

/**
 * Number formatting configuration
 */
export interface NumberFormatConfig {
  type: 'number' | 'currency';
  currency?: string;              // e.g., 'USD', 'EUR'
  locale?: string;                // e.g., 'en-US', 'de-DE'
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * String split configuration
 */
export interface SplitConfig {
  delimiter: string;
  isRegex?: boolean;
  trim?: boolean;
}

/**
 * String concatenation configuration
 */
export interface ConcatenateConfig {
  separator: string;
  trim?: boolean;
}

/**
 * Conditional mapping configuration
 */
export interface ConditionalConfig {
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: unknown;
  thenValue: unknown;
  elseValue: unknown;
}

/**
 * Constant value configuration
 */
export interface ConstantConfig {
  value: unknown;
}

/**
 * Lookup table configuration
 */
export interface LookupConfig {
  tableName: string;
  defaultValue?: unknown;
}

/**
 * Direct mapping configuration
 */
export interface DirectConfig {}

/**
 * Custom JavaScript configuration
 */
export interface CustomJSConfig {
  code: string;
  timeout?: number;
  memoryLimit?: number;
}
