/**
 * Direct transformation function
 */

import type { DirectConfig } from '../types';

/**
 * Pass through input value unchanged
 */
export function directMap(input: unknown, _config: DirectConfig): unknown {
  return input;
}
