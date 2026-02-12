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

/**
 * Transform function registry
 */
export const transformRegistry = new Map<TransformationType, TransformFunction>();

// Register all built-in transforms
transformRegistry.set('format_date', formatDate as TransformFunction);
transformRegistry.set('format_number', formatNumber as TransformFunction);
transformRegistry.set('split', splitString as TransformFunction);
transformRegistry.set('concatenate', concatenateStrings as TransformFunction);
transformRegistry.set('conditional', applyConditional as TransformFunction);
transformRegistry.set('constant', setConstant as TransformFunction);

// Register placeholder functions for not-yet-implemented transforms
transformRegistry.set('lookup', () => {
  throw new Error('lookup transform not yet implemented');
});

transformRegistry.set('custom_js', () => {
  throw new Error('custom_js transform not yet implemented');
});

/**
 * Execute a transformation by type
 */
export function executeTransform(type: TransformationType, input: unknown, config: Record<string, unknown>): unknown {
  const transform = transformRegistry.get(type);

  if (!transform) {
    throw new Error(`Unknown transformation type: ${type}`);
  }

  return transform(input, config);
}
