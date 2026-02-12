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
  DirectConfig,
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
  DirectConfigSchema,
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
