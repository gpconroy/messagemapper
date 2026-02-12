/**
 * Transformation Module
 *
 * Barrel export for all transformation functionality
 */

// Types
export type {
  TransformationType,
  TransformFunction,
  TransformationRule,
  DateFormatConfig,
  NumberFormatConfig,
  SplitConfig,
  ConcatenateConfig,
  ConditionalConfig,
  ConstantConfig,
  LookupConfig,
  CustomJSConfig,
} from './types';

// Registry
export { transformRegistry, executeTransform } from './registry';

// Pipeline
export type {
  TransformationResult,
  RuleResult,
  TransformationContext,
  TransformationOptions,
} from './pipeline';
export { applyTransformations } from './pipeline';

// Validator
export {
  TransformationRuleSchema,
  DateFormatConfigSchema,
  NumberFormatConfigSchema,
  SplitConfigSchema,
  ConcatenateConfigSchema,
  ConditionalConfigSchema,
  ConstantConfigSchema,
  LookupConfigSchema,
  CustomJSConfigSchema,
  validateTransformationRules,
} from './validator';
