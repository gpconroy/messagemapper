# Phase 5: Transformation System - Research

**Researched:** 2026-02-12
**Domain:** Data transformation, JavaScript sandboxing, expression evaluation
**Confidence:** MEDIUM-HIGH

## Summary

Phase 5 implements field transformations beyond simple 1:1 mapping, including format conversion, split/concatenate operations, conditional logic, lookup tables, and custom JavaScript functions. The critical security concern is sandboxing custom JavaScript transformations to prevent code injection.

The standard approach uses date-fns for date formatting (NOT moment.js, which is deprecated), native Intl APIs for number/currency formatting, math.js for safe expression evaluation, and isolated-vm for secure JavaScript sandboxing. DO NOT use vm2 due to multiple critical sandbox escape vulnerabilities (CVE-2026-22709 and others). Transformation functions should follow the functional pipeline pattern with strong typing, immutability, and composability.

**Primary recommendation:** Use isolated-vm with strict resource limits for custom JavaScript execution, native Intl APIs for formatting, math.js for formula evaluation, and store transformation rules as typed JSON in PostgreSQL with RLS for tenant isolation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 4.1.0 | Date parsing and formatting | 200+ functions, tree-shakeable, immutable, first-class timezone support (v4), TypeScript native |
| isolated-vm | Latest | JavaScript sandbox isolation | Uses V8's native Isolate interface, proper memory/timeout limits, recommended by vm2 maintainers |
| math.js | Latest | Safe expression evaluation | Blacklisted symbol prevention, custom functions, no eval() needed |
| zod | Latest | Transformation validation | Runtime validation with .transform(), .safeParse() for dry-run, TypeScript integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | Native | Number/currency formatting | All numeric formatting (97%+ browser support, no library needed) |
| Intl.DateTimeFormat | Native | Locale-aware date formatting | When locale-specific formatting needed |
| prisma-json-types-generator | Latest | Type-safe JSON columns | Strongly typing transformation rule storage in PostgreSQL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| isolated-vm | @sebastianwessel/quickjs (WebAssembly) | QuickJS lighter but less Node.js compatibility; good for browser-only scenarios |
| isolated-vm | vm2 | **DO NOT USE** - multiple critical sandbox escapes (CVE-2026-22709, etc.), discontinued then partially maintained |
| date-fns | luxon | Luxon has built-in timezone but heavier bundle; date-fns 4.x now has timezone support |
| date-fns | dayjs | dayjs lighter but fewer functions; date-fns tree-shaking achieves similar bundle size |
| math.js | expr-eval | expr-eval simpler but math.js has better security (blacklist symbols, Map-based scopes) |

**Installation:**
```bash
npm install date-fns isolated-vm mathjs zod
npm install --save-dev prisma-json-types-generator
```

**Note on isolated-vm:** Requires Node.js 16+. For Node.js 20+, must pass `--no-node-snapshot` flag.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── transformations/
│   ├── types.ts              # Transformation rule types
│   ├── registry.ts           # Function registry pattern
│   ├── builtins/             # Built-in transformation functions
│   │   ├── format.ts         # Date/number formatting
│   │   ├── string.ts         # Split/concatenate
│   │   ├── conditional.ts    # If-then-else logic
│   │   ├── lookup.ts         # Lookup table resolution
│   │   └── constant.ts       # Constant value assignments
│   ├── custom/               # Custom JS execution
│   │   ├── sandbox.ts        # isolated-vm wrapper
│   │   └── executor.ts       # Safe execution with timeout/memory limits
│   ├── pipeline.ts           # Transformation pipeline orchestration
│   └── validator.ts          # Zod schemas for validation
├── api/
│   └── transformations/
│       ├── route.ts          # CRUD for transformation rules
│       └── preview.ts        # Dry-run transformation preview
```

### Pattern 1: Function Registry for Transformation Types
**What:** Map transformation types to handler functions without switch statements
**When to use:** For built-in transformation functions (format, split, concat, conditional, lookup, constant)
**Benefits:** Extensible without modifying existing code, each function has single responsibility, easily testable

**Example:**
```typescript
// Source: Function Registry Pattern - https://javascript.plainenglish.io/function-registry-pattern-explained-clean-scalable-composable-code-e483bb7f2444

type TransformFunction = (
  input: unknown,
  config: Record<string, unknown>
) => unknown;

const transformRegistry = new Map<string, TransformFunction>([
  ['format_date', formatDate],
  ['format_number', formatNumber],
  ['split', splitString],
  ['concatenate', concatenateStrings],
  ['conditional', applyConditional],
  ['lookup', resolveLookup],
  ['constant', setConstant],
  ['custom_js', executeCustomJS],
]);

function executeTransform(type: string, input: unknown, config: Record<string, unknown>) {
  const transform = transformRegistry.get(type);
  if (!transform) {
    throw new Error(`Unknown transformation type: ${type}`);
  }
  return transform(input, config);
}
```

### Pattern 2: Transformation Pipeline with Validation
**What:** Chain transformations with pre/post validation using Zod
**When to use:** For all transformation execution (both preview and actual)
**Benefits:** Type-safe at runtime, fail fast with clear errors, dry-run capability

**Example:**
```typescript
// Source: Zod validation - https://blog.codeminer42.com/zod-validation-101/

import { z } from 'zod';

const TransformationRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['format_date', 'format_number', 'split', 'concatenate', 'conditional', 'lookup', 'constant', 'custom_js']),
  sourceFields: z.array(z.string()),
  targetField: z.string(),
  config: z.record(z.unknown()),
});

type TransformationRule = z.infer<typeof TransformationRuleSchema>;

async function applyTransformations(
  data: Record<string, unknown>,
  rules: unknown[],
  options: { dryRun?: boolean } = {}
): Promise<{ success: boolean; result?: Record<string, unknown>; errors?: string[] }> {
  // Validate rules first
  const validationResult = z.array(TransformationRuleSchema).safeParse(rules);

  if (!validationResult.success) {
    return { success: false, errors: validationResult.error.errors.map(e => e.message) };
  }

  const validRules = validationResult.data;
  const result = { ...data };

  for (const rule of validRules) {
    try {
      const input = rule.sourceFields.length === 1
        ? result[rule.sourceFields[0]]
        : rule.sourceFields.map(f => result[f]);

      const transformed = executeTransform(rule.type, input, rule.config);

      if (!options.dryRun) {
        result[rule.targetField] = transformed;
      }
    } catch (error) {
      return { success: false, errors: [`Transform ${rule.id} failed: ${error.message}`] };
    }
  }

  return { success: true, result };
}
```

### Pattern 3: Secure JavaScript Sandbox with Resource Limits
**What:** Execute custom JavaScript in isolated V8 isolate with strict timeout and memory limits
**When to use:** For XFRM-07 custom JavaScript transformation functions
**Security:** CRITICAL - prevents code injection, infinite loops, memory exhaustion

**Example:**
```typescript
// Source: isolated-vm documentation - https://github.com/laverdet/isolated-vm

import ivm from 'isolated-vm';

interface SandboxOptions {
  timeout: number;      // milliseconds
  memoryLimit: number;  // MB
}

async function executeCustomJS(
  code: string,
  input: unknown,
  options: SandboxOptions = { timeout: 5000, memoryLimit: 128 }
): Promise<unknown> {
  const isolate = new ivm.Isolate({
    memoryLimit: options.memoryLimit
  });

  const context = await isolate.createContext();
  const jail = context.global;

  // Set input as global variable
  await jail.set('input', new ivm.ExternalCopy(input).copyInto());

  // Execute code with timeout
  const script = await isolate.compileScript(`
    (function() {
      ${code}
    })()
  `);

  try {
    const result = await script.run(context, { timeout: options.timeout });
    return result;
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error('Transformation timed out');
    }
    if (error.message.includes('memory')) {
      throw new Error('Transformation exceeded memory limit');
    }
    throw error;
  } finally {
    isolate.dispose();
  }
}
```

### Pattern 4: Date Formatting with date-fns
**What:** Format dates using date-fns (NOT moment.js)
**When to use:** For XFRM-01 date format conversions

**Example:**
```typescript
// Source: date-fns documentation - https://github.com/date-fns/date-fns

import { format, parse } from 'date-fns';

function formatDate(input: unknown, config: { from?: string; to: string }): string {
  let date: Date;

  if (typeof input === 'string' && config.from) {
    // Parse from source format
    date = parse(input, config.from, new Date());
  } else if (input instanceof Date) {
    date = input;
  } else {
    throw new Error('Invalid date input');
  }

  return format(date, config.to);
}

// Example usage:
// formatDate('2026-02-12', { to: 'MM/dd/yyyy' }) => '02/12/2026'
// formatDate('20260212', { from: 'yyyyMMdd', to: 'yyyy-MM-dd' }) => '2026-02-12'
```

### Pattern 5: Number and Currency Formatting with Native Intl
**What:** Use native Intl.NumberFormat (no library needed)
**When to use:** For XFRM-01 number formats and currency codes
**Benefits:** 97%+ browser support, no bundle size, standardized

**Example:**
```typescript
// Source: Intl.NumberFormat MDN - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat

function formatNumber(input: unknown, config: { type: 'number' | 'currency'; currency?: string; locale?: string }): string {
  const value = typeof input === 'string' ? parseFloat(input) : Number(input);

  if (isNaN(value)) {
    throw new Error('Invalid number input');
  }

  const options: Intl.NumberFormatOptions = {
    style: config.type,
  };

  if (config.type === 'currency' && config.currency) {
    options.currency = config.currency;
  }

  const formatter = new Intl.NumberFormat(config.locale || 'en-US', options);
  return formatter.format(value);
}

// Example usage:
// formatNumber(1234.56, { type: 'currency', currency: 'USD' }) => '$1,234.56'
// formatNumber(1234.56, { type: 'currency', currency: 'EUR', locale: 'de-DE' }) => '1.234,56 €'
```

### Pattern 6: String Split and Concatenate
**What:** Split one field to multiple or concatenate multiple to one
**When to use:** For XFRM-02 (concatenate) and XFRM-03 (split)
**Best practices:** Trim whitespace, handle empty strings, support regex

**Example:**
```typescript
// Source: TypeScript string split best practices - https://thelinuxcode.com/typescript-string-split-method-practical-patterns-edge-cases-and-modern-usage/

function concatenateStrings(inputs: unknown, config: { separator: string; trim?: boolean }): string {
  if (!Array.isArray(inputs)) {
    throw new Error('Concatenate expects array of inputs');
  }

  const strings = inputs.map(i => String(i));
  return config.trim
    ? strings.map(s => s.trim()).join(config.separator)
    : strings.join(config.separator);
}

function splitString(input: unknown, config: { delimiter: string; isRegex?: boolean; trim?: boolean }): string[] {
  const str = String(input);
  const separator = config.isRegex ? new RegExp(config.delimiter) : config.delimiter;
  const parts = str.split(separator);

  return config.trim
    ? parts.map(p => p.trim()).filter(p => p !== '')
    : parts;
}

// Example usage:
// concatenateStrings(['John', 'Doe'], { separator: ' ', trim: true }) => 'John Doe'
// splitString('John,Doe', { delimiter: ',', trim: true }) => ['John', 'Doe']
// splitString('John, Doe ; Jane', { delimiter: '[,;]', isRegex: true, trim: true }) => ['John', 'Doe', 'Jane']
```

### Pattern 7: Conditional Logic with Type Guards
**What:** If-then-else logic for conditional mapping
**When to use:** For XFRM-05 conditional mapping rules

**Example:**
```typescript
interface ConditionalConfig {
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: unknown;
  thenValue: unknown;
  elseValue: unknown;
}

function applyConditional(input: unknown, config: ConditionalConfig): unknown {
  let condition = false;

  switch (config.operator) {
    case 'equals':
      condition = input === config.value;
      break;
    case 'notEquals':
      condition = input !== config.value;
      break;
    case 'contains':
      condition = String(input).includes(String(config.value));
      break;
    case 'greaterThan':
      condition = Number(input) > Number(config.value);
      break;
    case 'lessThan':
      condition = Number(input) < Number(config.value);
      break;
  }

  return condition ? config.thenValue : config.elseValue;
}

// Example usage:
// applyConditional('ACTIVE', { operator: 'equals', value: 'ACTIVE', thenValue: true, elseValue: false }) => true
```

### Pattern 8: Lookup Table Resolution
**What:** Code translation using lookup tables stored in database
**When to use:** For XFRM-06 lookup tables for code translation
**Storage:** PostgreSQL table with tenant_id, lookup_table_name, from_value, to_value

**Example:**
```typescript
// Source: PostgreSQL RLS multi-tenant - https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/

interface LookupTableEntry {
  tenantId: string;
  tableName: string;
  fromValue: string;
  toValue: string;
}

async function resolveLookup(
  input: unknown,
  config: { tableName: string; defaultValue?: unknown },
  context: { tenantId: string; prisma: PrismaClient }
): Promise<unknown> {
  const fromValue = String(input);

  // PostgreSQL RLS automatically filters by tenantId
  const entry = await context.prisma.lookupTable.findFirst({
    where: {
      tableName: config.tableName,
      fromValue: fromValue,
    },
  });

  if (!entry) {
    if (config.defaultValue !== undefined) {
      return config.defaultValue;
    }
    throw new Error(`No lookup entry found for ${fromValue} in table ${config.tableName}`);
  }

  return entry.toValue;
}

// Example usage:
// resolveLookup('USD', { tableName: 'currency_codes' }) => 'US Dollar'
```

### Pattern 9: Constant Value Assignment
**What:** Set a target field to a constant value (not sourced from input)
**When to use:** For XFRM-04 constant value assignments

**Example:**
```typescript
function setConstant(_input: unknown, config: { value: unknown }): unknown {
  return config.value;
}

// Example usage:
// setConstant(null, { value: 'DEFAULT_STATUS' }) => 'DEFAULT_STATUS'
```

### Pattern 10: Result Pattern for Error Handling
**What:** Explicit error handling without try-catch everywhere
**When to use:** Throughout transformation pipeline for clean error propagation

**Example:**
```typescript
// Source: Result pattern - https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern-5b96a5abb6d3

type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function safeTransform<T>(
  fn: () => T
): Result<T> {
  try {
    return { success: true, value: fn() };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Chain transformations
function chainResults<T, U>(
  result: Result<T>,
  fn: (value: T) => Result<U>
): Result<U> {
  if (!result.success) {
    return result;
  }
  return fn(result.value);
}
```

### Anti-Patterns to Avoid

- **Using eval() or Function constructor for custom code:** Use isolated-vm sandbox instead
- **Using vm2 for sandboxing:** Multiple critical vulnerabilities, use isolated-vm
- **Using moment.js for dates:** Deprecated, use date-fns
- **Hand-rolling date/number formatting:** Use date-fns and native Intl APIs
- **Storing transformation code as strings without validation:** Use Zod schemas to validate rule structure
- **Sharing isolate instances across executions:** Dispose isolate after each execution to prevent memory leaks
- **No timeout on custom JavaScript:** Always set timeout (5s recommended)
- **No memory limit on custom JavaScript:** Always set memoryLimit (128MB recommended)
- **Transforming without validation:** Always validate input and output with Zod schemas
- **Mutable transformations:** Use pure functions that return new values

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JavaScript sandboxing | Custom eval() wrapper with try-catch | isolated-vm with Isolate | Prototype pollution, infinite loops, memory exhaustion, code injection - impossible to secure eval() |
| Date formatting | Custom date parsing/formatting | date-fns | Timezone edge cases, locale handling, leap years, DST - 200+ functions already tested |
| Number/currency formatting | String manipulation for currency | Intl.NumberFormat | Locale-specific decimal separators, currency symbols, rounding rules - 97%+ browser support |
| Expression evaluation | Custom parser with eval() | math.js | Operator precedence, parentheses, functions, variables - math.js has blacklisted symbols |
| Transformation validation | Manual type checking | Zod with .safeParse() | Runtime type validation, transformation, error messages - TypeScript types don't exist at runtime |
| Lookup table caching | In-memory Map | PostgreSQL with proper indexing | Multi-tenant isolation, persistence, cache invalidation - database does this better |
| Regex escaping for split | Custom escape function | String.split() with regex literal | Edge cases with special characters, performance - native is faster and battle-tested |

**Key insight:** Data transformation has deceptively complex edge cases. Use specialized libraries that have solved the edge cases at scale. Security (sandboxing) and correctness (date/number formatting) are too critical to hand-roll.

## Common Pitfalls

### Pitfall 1: Memory Leaks from Undisposed Isolates
**What goes wrong:** Creating isolates without calling .dispose() causes memory to never be released
**Why it happens:** JavaScript's garbage collector cannot clean up V8 isolate memory automatically
**How to avoid:** Always dispose isolate in finally block or use RAII pattern
**Warning signs:** Memory usage grows over time, Node.js process crashes with out of memory

```typescript
// BAD
async function executeCode(code: string) {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const script = await isolate.compileScript(code);
  return await script.run(context);
  // isolate never disposed!
}

// GOOD
async function executeCode(code: string) {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  try {
    const context = await isolate.createContext();
    const script = await isolate.compileScript(code);
    return await script.run(context);
  } finally {
    isolate.dispose(); // Always cleanup
  }
}
```

### Pitfall 2: Timezone Issues with Date Parsing
**What goes wrong:** Parsing dates as local time when they should be UTC or vice versa
**Why it happens:** Date constructor and parsing have implicit timezone assumptions
**How to avoid:** Always specify timezone explicitly with date-fns or use ISO 8601 strings
**Warning signs:** Dates off by hours when users are in different timezones, date shifts by one day

```typescript
// BAD - implicit local timezone
const date = new Date('2026-02-12'); // Parsed as local midnight or UTC midnight?

// GOOD - explicit timezone handling
import { parseISO, formatInTimeZone } from 'date-fns-tz';
const date = parseISO('2026-02-12T00:00:00Z'); // Explicit UTC
const formatted = formatInTimeZone(date, 'America/New_York', 'yyyy-MM-dd HH:mm:ss zzz');
```

### Pitfall 3: Regex Injection in Split Delimiter
**What goes wrong:** User-provided regex delimiters can crash the application or cause ReDoS
**Why it happens:** Allowing arbitrary regex without validation or timeout
**How to avoid:** Validate regex patterns, use string delimiters when possible, set timeout on regex operations
**Warning signs:** Application hangs on certain input, CPU spikes to 100%

```typescript
// BAD - unvalidated user regex
function splitString(input: string, userRegex: string): string[] {
  return input.split(new RegExp(userRegex)); // ReDoS vulnerable
}

// GOOD - validate or use string delimiter
function splitString(input: string, delimiter: string, isRegex: boolean = false): string[] {
  if (!isRegex) {
    return input.split(delimiter);
  }

  // Validate regex is safe (whitelist allowed patterns)
  const safeRegexPatterns = /^[\[\]a-zA-Z0-9,;\s\-_]+$/;
  if (!safeRegexPatterns.test(delimiter)) {
    throw new Error('Invalid regex pattern');
  }

  return input.split(new RegExp(delimiter));
}
```

### Pitfall 4: Not Validating Custom JavaScript Code Before Execution
**What goes wrong:** Malicious or buggy code makes it to production sandbox
**Why it happens:** No pre-execution validation or static analysis
**How to avoid:** Use Zod to validate structure, optionally use ESLint parser to check for syntax errors before sandbox execution
**Warning signs:** Sandbox timeouts, security incidents, production errors

```typescript
// BAD - execute without validation
async function executeCustomJS(code: string) {
  return await runInSandbox(code);
}

// GOOD - validate before execution
import { z } from 'zod';

const CustomJSSchema = z.object({
  code: z.string().min(1).max(10000), // Length limits
  timeout: z.number().min(100).max(30000),
  memoryLimit: z.number().min(8).max(512),
});

async function executeCustomJS(input: unknown) {
  const validated = CustomJSSchema.parse(input);

  // Optional: Check for syntax errors
  try {
    new Function(validated.code); // Parse but don't execute
  } catch (error) {
    throw new Error(`Invalid JavaScript syntax: ${error.message}`);
  }

  return await runInSandbox(validated.code, {
    timeout: validated.timeout,
    memoryLimit: validated.memoryLimit,
  });
}
```

### Pitfall 5: Lookup Table Cache Invalidation
**What goes wrong:** Cached lookup values become stale after updates
**Why it happens:** In-memory cache not invalidated when database updates occur
**How to avoid:** Use PostgreSQL for lookup storage with proper indexing, let Prisma handle caching, or use time-based cache expiration
**Warning signs:** Users report incorrect transformations, transformations use old values after updates

```typescript
// BAD - in-memory cache never invalidated
const lookupCache = new Map<string, Map<string, string>>();

async function resolveLookup(tableName: string, fromValue: string) {
  if (!lookupCache.has(tableName)) {
    // Load entire table into memory
    const entries = await prisma.lookupTable.findMany({ where: { tableName } });
    lookupCache.set(tableName, new Map(entries.map(e => [e.fromValue, e.toValue])));
  }
  return lookupCache.get(tableName)!.get(fromValue);
  // Cache never expires or invalidates!
}

// GOOD - let database handle it with proper indexes
async function resolveLookup(
  tableName: string,
  fromValue: string,
  context: { tenantId: string; prisma: PrismaClient }
) {
  // PostgreSQL with index on (tenant_id, table_name, from_value) is fast enough
  // RLS automatically filters by tenant_id
  const entry = await context.prisma.lookupTable.findFirst({
    where: { tableName, fromValue },
  });

  return entry?.toValue;
}

// Alternative: time-based cache with expiration
import NodeCache from 'node-cache';
const lookupCache = new NodeCache({ stdTTL: 300 }); // 5 minute TTL
```

### Pitfall 6: Transformation Order Dependency Not Handled
**What goes wrong:** Later transformations depend on earlier ones, but order is not guaranteed
**Why it happens:** No explicit ordering or dependency resolution
**How to avoid:** Store transformations with explicit order field, execute in sorted order, or use DAG for dependency resolution
**Warning signs:** Transformations work sometimes but fail other times, results depend on array order

```typescript
// BAD - assumes array order is execution order
const rules = await prisma.transformationRule.findMany({
  where: { mappingId },
});
// What if database returns in random order?

// GOOD - explicit ordering
const rules = await prisma.transformationRule.findMany({
  where: { mappingId },
  orderBy: { order: 'asc' }, // Explicit order field
});

// Or detect dependencies and build execution order
function buildExecutionOrder(rules: TransformationRule[]): TransformationRule[] {
  const graph = new Map<string, string[]>(); // targetField -> sourceFields

  for (const rule of rules) {
    graph.set(rule.targetField, rule.sourceFields);
  }

  // Topological sort to handle dependencies
  return topologicalSort(rules, graph);
}
```

### Pitfall 7: Not Handling Type Coercion Correctly
**What goes wrong:** String "123" is different from number 123 but transformations treat them the same
**Why it happens:** JavaScript's loose equality and type coercion
**How to avoid:** Use Zod schemas to define expected input/output types, use strict equality (===), explicitly parse types
**Warning signs:** Transformations fail with type errors, numeric operations on strings produce NaN

```typescript
// BAD - implicit type coercion
function formatNumber(input: any, config: any): string {
  return new Intl.NumberFormat().format(input); // What if input is "123abc"?
}

// GOOD - explicit type validation and parsing
const FormatNumberConfigSchema = z.object({
  type: z.enum(['number', 'currency']),
  currency: z.string().optional(),
  locale: z.string().default('en-US'),
});

function formatNumber(input: unknown, config: unknown): string {
  const validConfig = FormatNumberConfigSchema.parse(config);

  // Explicit type parsing
  let value: number;
  if (typeof input === 'number') {
    value = input;
  } else if (typeof input === 'string') {
    value = parseFloat(input);
    if (isNaN(value)) {
      throw new Error(`Cannot parse "${input}" as number`);
    }
  } else {
    throw new Error(`Expected number or string, got ${typeof input}`);
  }

  // Now safely format
  return new Intl.NumberFormat(validConfig.locale, {
    style: validConfig.type,
    currency: validConfig.currency,
  }).format(value);
}
```

### Pitfall 8: Storing Transformation Rules as Untyped JSON
**What goes wrong:** Invalid transformation rules are stored and only fail at execution time
**Why it happens:** PostgreSQL JSON columns accept any JSON without schema validation
**How to avoid:** Use Zod schemas to validate before insert/update, use prisma-json-types-generator for TypeScript typing
**Warning signs:** Runtime errors when applying transformations, production failures from bad rules

```typescript
// BAD - no validation before storage
async function createTransformationRule(data: any) {
  return await prisma.transformationRule.create({
    data: {
      config: data.config, // Any JSON accepted
    },
  });
}

// GOOD - validate before storage
const CreateTransformationRuleSchema = z.object({
  type: z.enum(['format_date', 'format_number', 'split', 'concatenate', 'conditional', 'lookup', 'constant', 'custom_js']),
  sourceFields: z.array(z.string()).min(1),
  targetField: z.string(),
  config: z.record(z.unknown()), // Or more specific schema per type
  order: z.number().int().min(0),
});

async function createTransformationRule(data: unknown) {
  const validated = CreateTransformationRuleSchema.parse(data);

  // Additional type-specific validation
  if (validated.type === 'format_date') {
    const configSchema = z.object({
      from: z.string().optional(),
      to: z.string(),
    });
    configSchema.parse(validated.config);
  }

  return await prisma.transformationRule.create({
    data: validated,
  });
}
```

## Code Examples

Verified patterns from official sources:

### Complete Transformation Execution Flow
```typescript
// Combines patterns from multiple sources above

import { z } from 'zod';
import ivm from 'isolated-vm';
import { format, parse } from 'date-fns';
import { PrismaClient } from '@prisma/client';

// 1. Define transformation types
const TransformationRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['format_date', 'format_number', 'split', 'concatenate', 'conditional', 'lookup', 'constant', 'custom_js']),
  sourceFields: z.array(z.string()),
  targetField: z.string(),
  config: z.record(z.unknown()),
  order: z.number(),
});

type TransformationRule = z.infer<typeof TransformationRuleSchema>;

// 2. Build function registry
type TransformContext = {
  tenantId: string;
  prisma: PrismaClient;
};

type TransformFunction = (
  input: unknown,
  config: Record<string, unknown>,
  context: TransformContext
) => Promise<unknown>;

const transformRegistry = new Map<string, TransformFunction>([
  ['format_date', async (input, config) => {
    const date = typeof input === 'string' && config.from
      ? parse(input as string, config.from as string, new Date())
      : new Date(input as string);
    return format(date, config.to as string);
  }],
  ['format_number', async (input, config) => {
    const value = typeof input === 'string' ? parseFloat(input) : Number(input);
    return new Intl.NumberFormat(config.locale as string || 'en-US', {
      style: config.type as 'number' | 'currency',
      currency: config.currency as string,
    }).format(value);
  }],
  ['concatenate', async (input, config) => {
    if (!Array.isArray(input)) throw new Error('Expected array');
    return input.map(i => String(i)).join(config.separator as string);
  }],
  ['split', async (input, config) => {
    const str = String(input);
    const sep = config.isRegex ? new RegExp(config.delimiter as string) : config.delimiter as string;
    return str.split(sep);
  }],
  ['conditional', async (input, config) => {
    let condition = false;
    switch (config.operator) {
      case 'equals': condition = input === config.value; break;
      case 'contains': condition = String(input).includes(String(config.value)); break;
    }
    return condition ? config.thenValue : config.elseValue;
  }],
  ['lookup', async (input, config, context) => {
    const entry = await context.prisma.lookupTable.findFirst({
      where: {
        tableName: config.tableName as string,
        fromValue: String(input),
      },
    });
    return entry?.toValue ?? config.defaultValue;
  }],
  ['constant', async (_input, config) => config.value],
  ['custom_js', async (input, config) => {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    try {
      const context = await isolate.createContext();
      await context.global.set('input', new ivm.ExternalCopy(input).copyInto());
      const script = await isolate.compileScript(config.code as string);
      return await script.run(context, { timeout: 5000 });
    } finally {
      isolate.dispose();
    }
  }],
]);

// 3. Execute transformation pipeline
async function applyTransformations(
  data: Record<string, unknown>,
  rules: unknown[],
  context: TransformContext,
  options: { dryRun?: boolean } = {}
): Promise<{ success: boolean; result?: Record<string, unknown>; errors?: string[] }> {
  // Validate rules
  const validationResult = z.array(TransformationRuleSchema).safeParse(rules);
  if (!validationResult.success) {
    return { success: false, errors: validationResult.error.errors.map(e => e.message) };
  }

  // Sort by order
  const validRules = validationResult.data.sort((a, b) => a.order - b.order);
  const result = { ...data };

  // Execute transformations
  for (const rule of validRules) {
    try {
      const input = rule.sourceFields.length === 1
        ? result[rule.sourceFields[0]]
        : rule.sourceFields.map(f => result[f]);

      const transformFn = transformRegistry.get(rule.type);
      if (!transformFn) {
        throw new Error(`Unknown transformation type: ${rule.type}`);
      }

      const transformed = await transformFn(input, rule.config, context);

      if (!options.dryRun) {
        result[rule.targetField] = transformed;
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Rule ${rule.id} (${rule.type}) failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  return { success: true, result };
}

// 4. API endpoint example
export async function POST(req: Request) {
  const session = await getSession();
  const { mappingId, data, dryRun } = await req.json();

  const prisma = new PrismaClient();

  // Load transformation rules (RLS filters by tenant automatically)
  const rules = await prisma.transformationRule.findMany({
    where: { mappingId },
    orderBy: { order: 'asc' },
  });

  const result = await applyTransformations(
    data,
    rules,
    { tenantId: session.tenantId, prisma },
    { dryRun }
  );

  return Response.json(result);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| moment.js for dates | date-fns or native Temporal (ES2026+) | 2020 (moment deprecated) | Smaller bundles (moment is monolithic), immutability by default |
| vm2 for sandboxing | isolated-vm or QuickJS (WASM) | 2023-2026 (multiple vm2 CVEs) | Better security through V8 native isolates vs proxy-based sandboxing |
| eval() for expressions | math.js or safe-eval libraries | Always (eval never safe) | Prevents code injection, provides controlled execution environment |
| Custom currency formatting | Intl.NumberFormat | 2020 (widespread support) | Standardized, locale-aware, no library needed |
| Joi/Yup for validation | Zod | 2022-2024 (TypeScript rise) | Better TypeScript inference, smaller bundle, composability |
| In-memory transformation cache | PostgreSQL with proper indexes | 2020s (multi-tenant SaaS patterns) | RLS-based tenant isolation, no cache invalidation logic needed |

**Deprecated/outdated:**
- **moment.js**: Officially deprecated since 2020, use date-fns or await native Temporal API
- **vm2**: Multiple sandbox escape CVEs (2023-2026), maintainer recommends isolated-vm
- **eval() / Function constructor**: Never safe for user input, use math.js or isolated-vm
- **lodash for date/number formatting**: Use native Intl APIs (97%+ browser support) or date-fns
- **Joi/Yup**: Being replaced by Zod in TypeScript projects for better type inference

**Emerging:**
- **Temporal API**: Native JavaScript date/time API (ES2026+), will eventually replace date-fns but not yet widely supported
- **QuickJS on WebAssembly**: Alternative to isolated-vm, better for browser environments
- **Effect-TS**: Functional programming library for TypeScript, includes Result/Either patterns for error handling

## Open Questions

1. **Do we need bi-directional transformations (source→target and target→source)?**
   - What we know: Requirements only specify source→target
   - What's unclear: Whether inverse transformations needed for editing mapped data
   - Recommendation: Start with one-way (source→target), add inverse if needed in Phase 6+

2. **How to handle transformation failures in bulk operations?**
   - What we know: Individual transformations can fail
   - What's unclear: Fail entire batch or continue with errors collected?
   - Recommendation: Collect all errors and return batch result with successes/failures, let user decide to retry

3. **Should custom JavaScript functions have access to external APIs?**
   - What we know: isolated-vm can enable fetch/network if configured
   - What's unclear: Use case for external API calls in transformations
   - Recommendation: Start with network disabled (default), add if specific use case emerges

4. **Performance target for transformation execution?**
   - What we know: Transformations will run on every mapping execution
   - What's unclear: Expected data volume, latency requirements
   - Recommendation: Target <100ms for 10 transformations on single record, benchmark in Phase 5, optimize in Phase 6 if needed

5. **Should lookup tables support expiration/versioning?**
   - What we know: Lookup tables need CRUD management (XFRM-06)
   - What's unclear: Whether historical lookups needed, time-based validity
   - Recommendation: Start with simple current-value model, add effective_date/expiration_date columns if use case emerges

6. **Custom JavaScript function UI: code editor or textarea?**
   - What we know: Need to accept JavaScript code input
   - What's unclear: Level of developer tooling expected
   - Recommendation: Start with syntax-highlighted textarea (Monaco Editor react component), not full IDE

## Sources

### Primary (HIGH confidence)
- [isolated-vm GitHub](https://github.com/laverdet/isolated-vm) - Sandbox implementation, API documentation
- [date-fns GitHub](https://github.com/date-fns/date-fns) - v4.1.0 features, formatting functions
- [math.js documentation](https://mathjs.org/docs/expressions/parsing.html) - Expression evaluation, security features
- [Zod documentation](https://zod.dev/) - Schema validation, transformation, TypeScript integration
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - Native number/currency formatting

### Secondary (MEDIUM confidence)
- [vm2 critical vulnerabilities 2026](https://thehackernews.com/2026/01/critical-vm2-nodejs-flaw-allows-sandbox.html) - CVE-2026-22709 sandbox escape
- [AWS Multi-tenant RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) - PostgreSQL RLS patterns
- [Function Registry Pattern](https://javascript.plainenglish.io/function-registry-pattern-explained-clean-scalable-composable-code-e483bb7f2444) - Architecture pattern for extensible transformations
- [Result Pattern TypeScript](https://arg-software.medium.com/functional-error-handling-in-typescript-with-the-result-pattern-5b96a5abb6d3) - Error handling pattern
- [OneUpTime Event Transformation](https://oneuptime.com/blog/post/2026-01-30-event-transformation/view) - Transformation pipeline architecture
- [Zod Validation Guide 2026](https://blog.codeminer42.com/zod-validation-101/) - Zod best practices
- [LogRocket TypeScript ETL](https://blog.logrocket.com/use-typescript-instead-python-etl-pipelines/) - Data pipeline architecture in TypeScript
- [TypeScript String Split Best Practices](https://thelinuxcode.com/typescript-string-split-method-practical-patterns-edge-cases-and-modern-usage/) - String manipulation patterns
- [React Flow TypeScript](https://reactflow.dev/learn/advanced-use/typescript) - Custom node data handling (for UI)
- [Prisma JSON storage](https://wanago.io/2023/05/29/api-nestjs-prisma-json/) - PostgreSQL JSON with Prisma
- [prisma-json-types-generator](https://www.npmjs.com/package/prisma-json-types-generator) - Type-safe JSON columns

### Tertiary (LOW confidence, needs validation)
- [date-fns vs alternatives comparison](https://npm-compare.com/date-fns,dayjs,luxon,moment) - Library comparison (npm-compare, not official)
- [QuickJS WebAssembly](https://github.com/sebastianwessel/quickjs) - Alternative sandbox (needs performance testing vs isolated-vm)
- [JavaScript 2026 Resource Management](https://medium.com/@code_with_krishan/javascript-2026-just-changed-the-game-say-goodbye-to-try-finally-hell-53dd09d874ad) - Emerging 'using' keyword (not yet standard)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - isolated-vm, date-fns, math.js, Zod are industry standard with official docs verified
- Architecture: MEDIUM-HIGH - Function registry and pipeline patterns verified from multiple sources, but specific transformation system implementation less documented
- Pitfalls: MEDIUM - Sandbox memory leaks and timezone issues verified from official docs, other pitfalls derived from general TypeScript/JavaScript best practices

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - relatively stable domain, though check for isolated-vm updates and date-fns v4 adoption)

**Key areas needing validation during implementation:**
- isolated-vm performance vs QuickJS for this use case (benchmark needed)
- Optimal memory limits and timeouts for custom JavaScript (user testing needed)
- Lookup table cache strategy (benchmark PostgreSQL performance with expected data volume)
- Transformation UI patterns (UX research needed for code editor vs textarea)
