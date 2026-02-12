/**
 * Format transformation functions (date and number)
 */

import { parse, format, isValid } from 'date-fns';
import type { DateFormatConfig, NumberFormatConfig } from '../types';

/**
 * Format date values between different format strings
 */
export function formatDate(input: unknown, config: DateFormatConfig): string {
  if (typeof input !== 'string') {
    throw new Error('Invalid date input: input must be a string');
  }

  let date: Date;

  // If 'from' format is specified, parse using that format
  if (config.from) {
    date = parse(input, config.from, new Date());
  } else {
    // Otherwise, try to parse as ISO 8601 or native Date format
    date = new Date(input);
  }

  // Check if date is valid
  if (!isValid(date)) {
    throw new Error('Invalid date input');
  }

  // Format to target format
  return format(date, config.to);
}

/**
 * Format number values with locale-specific formatting
 */
export function formatNumber(input: unknown, config: NumberFormatConfig): string {
  // Convert to number if needed
  const num = typeof input === 'number' ? input : Number(input);

  if (isNaN(num)) {
    throw new Error('Invalid number input: input must be a valid number');
  }

  // Build Intl.NumberFormat options
  const options: Intl.NumberFormatOptions = {};

  if (config.type === 'currency') {
    options.style = 'currency';
    options.currency = config.currency || 'USD';
  } else {
    options.style = 'decimal';
  }

  if (config.minimumFractionDigits !== undefined) {
    options.minimumFractionDigits = config.minimumFractionDigits;
  }

  if (config.maximumFractionDigits !== undefined) {
    options.maximumFractionDigits = config.maximumFractionDigits;
  }

  const locale = config.locale || 'en-US';
  return new Intl.NumberFormat(locale, options).format(num);
}
