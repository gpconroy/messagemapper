/**
 * Constant transformation function
 */

import type { ConstantConfig } from '../types';

/**
 * Set a constant value regardless of input
 */
export function setConstant(_input: unknown, config: ConstantConfig): unknown {
  return config.value;
}
