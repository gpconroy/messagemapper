/**
 * Transformation Pipeline
 *
 * Chains transformation rules in order with error collection and dry-run support.
 */

import type { PrismaClient } from '@prisma/client';
import type { TransformationRule } from './types';
import { validateTransformationRules } from './validator';
import { executeTransform } from './registry';

/**
 * Result from a single rule execution
 */
export interface RuleResult {
  ruleId: string;
  type: string;
  success: boolean;
  output?: unknown;
  error?: string;
}

/**
 * Result from transformation pipeline
 */
export interface TransformationResult {
  success: boolean;
  result?: Record<string, unknown>;
  errors?: string[];
  ruleResults?: RuleResult[];
}

/**
 * Pipeline execution context
 */
export interface TransformationContext {
  prisma?: PrismaClient;
}

/**
 * Pipeline execution options
 */
export interface TransformationOptions {
  dryRun?: boolean;
}

/**
 * Apply transformation rules to data
 *
 * @param data - Input data object
 * @param rules - Transformation rules to apply
 * @param context - Execution context (e.g., Prisma client for lookup)
 * @param options - Execution options (e.g., dryRun)
 * @returns Transformation result with data, errors, and per-rule results
 */
export async function applyTransformations(
  data: Record<string, unknown>,
  rules: unknown[],
  context?: TransformationContext,
  options?: TransformationOptions
): Promise<TransformationResult> {
  const opts = { dryRun: false, ...options };

  // Step 1: Validate rules
  const validation = validateTransformationRules(rules);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const validatedRules = validation.rules!;

  // Step 2: Sort rules by order
  const sortedRules = [...validatedRules].sort((a, b) => a.order - b.order);

  // Step 3: Clone data
  const result = { ...data };

  // Step 4: Execute rules in order
  const ruleResults: RuleResult[] = [];
  const errors: string[] = [];

  for (const rule of sortedRules) {
    try {
      // Extract input from result using sourceFields
      let input: unknown;
      if (rule.sourceFields.length === 1) {
        // Single field - use direct value
        input = result[rule.sourceFields[0]];
      } else {
        // Multiple fields - create array of values
        input = rule.sourceFields.map((field) => result[field]);
      }

      // Execute transformation
      const output = await executeTransform(rule.type, input, rule.config, context);

      // Record result
      ruleResults.push({
        ruleId: rule.id,
        type: rule.type,
        success: true,
        output,
      });

      // Apply output to result (unless dry run)
      if (!opts.dryRun) {
        result[rule.targetField] = output;
      }
    } catch (error) {
      // Collect error but continue to next rule
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Rule ${rule.id} (${rule.type}): ${errorMessage}`);

      ruleResults.push({
        ruleId: rule.id,
        type: rule.type,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Step 5: Return results
  return {
    success: errors.length === 0,
    result: opts.dryRun ? data : result,
    errors: errors.length > 0 ? errors : undefined,
    ruleResults,
  };
}
