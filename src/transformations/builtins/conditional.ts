/**
 * Conditional transformation function
 */

import type { ConditionalConfig } from '../types';

/**
 * Apply conditional logic to map input to output based on operator
 */
export function applyConditional(input: unknown, config: ConditionalConfig): unknown {
  let condition = false;

  switch (config.operator) {
    case 'equals':
      condition = input === config.value;
      break;

    case 'notEquals':
      condition = input !== config.value;
      break;

    case 'contains':
      if (typeof input === 'string' && typeof config.value === 'string') {
        condition = input.includes(config.value);
      }
      break;

    case 'startsWith':
      if (typeof input === 'string' && typeof config.value === 'string') {
        condition = input.startsWith(config.value);
      }
      break;

    case 'endsWith':
      if (typeof input === 'string' && typeof config.value === 'string') {
        condition = input.endsWith(config.value);
      }
      break;

    case 'greaterThan':
      if (typeof input === 'number' && typeof config.value === 'number') {
        condition = input > config.value;
      }
      break;

    case 'lessThan':
      if (typeof input === 'number' && typeof config.value === 'number') {
        condition = input < config.value;
      }
      break;

    default:
      throw new Error(`Unknown operator: ${config.operator}`);
  }

  return condition ? config.thenValue : config.elseValue;
}
