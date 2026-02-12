/**
 * String transformation functions (split and concatenate)
 */

import type { SplitConfig, ConcatenateConfig } from '../types';

/**
 * Safe regex patterns whitelist to prevent ReDoS attacks
 */
const SAFE_REGEX_PATTERNS = [
  /^[\[\](),;:\s]+$/,  // Character classes with safe chars
  /^\[.*?\]$/,          // Simple character class
];

/**
 * Validate regex pattern against whitelist
 */
function isSafeRegex(pattern: string): boolean {
  // For now, allow simple character classes like [,;]
  // More complex patterns should be validated against whitelist
  return /^\[[^\]]+\]$/.test(pattern);
}

/**
 * Split a string into an array by delimiter
 */
export function splitString(input: unknown, config: SplitConfig): string[] {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: input must be a string');
  }

  let parts: string[];

  if (config.isRegex) {
    // Validate regex pattern for safety
    if (!isSafeRegex(config.delimiter)) {
      throw new Error('Invalid regex pattern: pattern not in safe whitelist');
    }

    const regex = new RegExp(config.delimiter);
    parts = input.split(regex);
  } else {
    parts = input.split(config.delimiter);
  }

  // Trim each part if requested
  if (config.trim) {
    parts = parts.map(part => part.trim());
  }

  return parts;
}

/**
 * Concatenate an array of strings with a separator
 */
export function concatenateStrings(input: unknown, config: ConcatenateConfig): string {
  if (!Array.isArray(input)) {
    throw new Error('Invalid input: input must be an array');
  }

  let parts = input;

  // Trim each part if requested
  if (config.trim) {
    parts = parts.map(part =>
      typeof part === 'string' ? part.trim() : String(part)
    );
  } else {
    // Ensure all parts are strings
    parts = parts.map(part => String(part));
  }

  return parts.join(config.separator);
}
