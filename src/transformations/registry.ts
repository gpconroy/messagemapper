/**
 * Transformation Registry
 *
 * Maps transformation types to their handler functions
 */

import type { TransformationType, TransformFunction } from './types';
import { formatDate, formatNumber } from './builtins/format';
import { splitString, concatenateStrings } from './builtins/string';
import { applyConditional } from './builtins/conditional';
import { setConstant } from './builtins/constant';
import { resolveLookup } from './builtins/lookup';
import { executeCustomJS } from './custom/sandbox';

/**
 * Transform function registry
 */
export const transformRegistry = new Map<TransformationType, TransformFunction>();

// Register all built-in transforms
transformRegistry.set('format_date', formatDate as unknown as TransformFunction);
transformRegistry.set('format_number', formatNumber as unknown as TransformFunction);
transformRegistry.set('split', splitString as unknown as TransformFunction);
transformRegistry.set('concatenate', concatenateStrings as unknown as TransformFunction);
transformRegistry.set('conditional', applyConditional as unknown as TransformFunction);
transformRegistry.set('constant', setConstant as unknown as TransformFunction);

// Register lookup transform
transformRegistry.set('lookup', resolveLookup as unknown as TransformFunction);

// Register custom JS transform with wrapper to match TransformFunction signature
transformRegistry.set('custom_js', async (input: unknown, config: Record<string, unknown>) => {
  const code = config.code as string;
  const timeout = (config.timeout as number) || 5000;
  const memoryLimit = (config.memoryLimit as number) || 128;

  return executeCustomJS(code, input, { timeout, memoryLimit });
});

/**
 * Execute a transformation by type
 */
export async function executeTransform(
  type: TransformationType,
  input: unknown,
  config: Record<string, unknown>,
  context?: { prisma?: unknown }
): Promise<unknown> {
  const transform = transformRegistry.get(type);

  if (!transform) {
    throw new Error(`Unknown transformation type: ${type}`);
  }

  // Call transform, passing context for lookup
  return transform(input, config, context);
}
