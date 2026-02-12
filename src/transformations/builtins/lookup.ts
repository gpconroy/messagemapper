/**
 * Lookup Table Transform
 *
 * Resolves values using tenant-scoped lookup tables stored in the database.
 */

import type { PrismaClient } from '@prisma/client';

export interface LookupConfig {
  tableName: string;
  defaultValue?: unknown;
}

/**
 * Resolve a value using a lookup table
 *
 * @param input - The value to look up
 * @param config - Lookup configuration (tableName, defaultValue)
 * @param context - Execution context containing Prisma client
 * @returns The mapped value from the lookup table
 * @throws Error if no entry found and no default value provided
 */
export async function resolveLookup(
  input: unknown,
  config: Record<string, unknown>,
  context?: { prisma?: PrismaClient }
): Promise<unknown> {
  if (!context?.prisma) {
    throw new Error('Lookup transform requires Prisma client in context');
  }

  const tableName = config.tableName as string | undefined;
  const defaultValue = config.defaultValue;

  if (!tableName) {
    throw new Error('Lookup transform requires tableName in config');
  }

  const fromValue = String(input);

  // Query for lookup entry
  const entry = await context.prisma.lookupTableEntry.findFirst({
    where: {
      lookupTable: {
        name: tableName,
      },
      fromValue,
    },
  });

  if (entry) {
    return entry.toValue;
  }

  // No entry found
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`No lookup entry found for "${fromValue}" in table "${tableName}"`);
}
