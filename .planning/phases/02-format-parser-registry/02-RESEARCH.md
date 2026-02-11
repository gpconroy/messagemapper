# Phase 2: Format Parser Registry - Research

**Researched:** 2026-02-11
**Domain:** Schema parsing, format conversion, plugin architectures
**Confidence:** HIGH for JSON/XML parsing, MEDIUM for XSD parsing

## Summary

Phase 2 requires building a pluggable parser architecture that normalizes XSD schemas, XML samples, JSON schemas, and JSON samples into a unified field tree structure. The JavaScript/TypeScript ecosystem provides mature solutions for JSON and XML parsing but has significant limitations for XSD schema parsing.

The recommended approach uses **Ajv** for JSON schema validation, **fast-xml-parser** for XML parsing, and a **server-side XSD parser** (libxmljs2-xsd) due to native dependency requirements. The parser registry should follow the Factory + Registry pattern with TypeScript discriminated unions for type-safe extensibility.

**Primary recommendation:** Build a factory-based parser registry using TypeScript interfaces and discriminated unions. Use Ajv for JSON schemas, fast-xml-parser for XML/JSON samples, and libxmljs2-xsd (server-side only) for XSD validation. Implement a recursive descent visitor pattern for tree traversal and normalization.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ajv | 8.x | JSON Schema validation and parsing | Fastest JSON validator, official JSON Schema draft support, excellent TypeScript integration, used by ESLint/Webpack/Fastify |
| fast-xml-parser | 5.x/6.x | XML parsing and structure inference | Zero dependencies, fastest pure JS XML parser, handles large files (100MB+), TypeScript definitions included |
| libxmljs2-xsd | 1.x | XSD schema validation (server-side only) | Only maintained XSD validator for Node.js, native libxml bindings, supports XSD includes and complex types |
| json-schema-ref-parser | Latest | JSON Schema $ref resolution | Industry standard for dereferencing JSON Schema references, supports external files and URLs |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @apidevtools/json-schema-ref-parser | Latest | Alternative $ref resolver | If json-schema-ref-parser has issues |
| zod | Latest | Runtime schema validation | If you need runtime validation beyond schema parsing (e.g., API input validation) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ajv | zod | Zod has better DX for TypeScript-first projects but doesn't support standard JSON Schema formats—use Ajv since users upload JSON Schema files |
| fast-xml-parser | xml2js | xml2js is more popular but slower and has callbacks—fast-xml-parser is faster and cleaner for promise-based code |
| libxmljs2-xsd | cxsd | cxsd generates TypeScript types from XSD but doesn't parse XSD into field trees—use libxmljs2-xsd for runtime parsing |

**Installation:**
```bash
npm install ajv ajv-formats fast-xml-parser json-schema-ref-parser
npm install libxmljs2-xsd  # Server-side only (Next.js API routes)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── parsers/
│       ├── registry.ts          # Parser registry with factory pattern
│       ├── base-parser.ts       # Abstract parser interface
│       ├── json-schema-parser.ts
│       ├── json-sample-parser.ts
│       ├── xml-sample-parser.ts
│       └── xsd-parser.ts        # Server-side only
├── types/
│   └── parser-types.ts          # FieldNode, ParserResult, etc.
└── app/
    └── api/
        └── parse-schema/
            └── route.ts         # Next.js API route for parsing
```

### Pattern 1: Factory + Registry Pattern

**What:** Central registry maps format types to parser implementations, factory creates appropriate parser based on file type/content

**When to use:** When you need extensible plugin architecture with compile-time type safety

**Example:**
```typescript
// Source: Factory Registry Pattern research + TypeScript discriminated unions

// Base parser interface
interface BaseParser {
  readonly format: string;
  parse(content: string | Buffer, options?: ParseOptions): Promise<FieldNode[]>;
  validate(content: string | Buffer): Promise<ValidationResult>;
}

// Discriminated union for type safety
type ParserType = 'json-schema' | 'json-sample' | 'xml-sample' | 'xsd';

// Registry with factory
class ParserRegistry {
  private parsers = new Map<ParserType, BaseParser>();

  register<T extends BaseParser>(type: ParserType, parser: T): void {
    this.parsers.set(type, parser);
  }

  getParser(type: ParserType): BaseParser {
    const parser = this.parsers.get(type);
    if (!parser) {
      throw new Error(`No parser registered for type: ${type}`);
    }
    return parser;
  }

  // Auto-detect format from file content
  async detectAndParse(content: string, filename: string): Promise<FieldNode[]> {
    const type = this.detectFormat(content, filename);
    const parser = this.getParser(type);
    return parser.parse(content);
  }

  private detectFormat(content: string, filename: string): ParserType {
    if (filename.endsWith('.xsd')) return 'xsd';
    if (filename.endsWith('.json')) {
      // Detect if JSON is schema vs sample
      const parsed = JSON.parse(content);
      return parsed.$schema ? 'json-schema' : 'json-sample';
    }
    if (filename.endsWith('.xml')) return 'xml-sample';
    throw new Error('Unknown format');
  }
}

// Usage
const registry = new ParserRegistry();
registry.register('json-schema', new JsonSchemaParser());
registry.register('xml-sample', new XmlSampleParser());
```

### Pattern 2: Visitor Pattern for Tree Traversal

**What:** Separate tree traversal logic from normalization logic using visitor pattern

**When to use:** When converting different schema structures into normalized FieldNode tree

**Example:**
```typescript
// Source: Visitor Pattern research + tree traversal patterns

interface FieldNode {
  id: string;
  name: string;
  path: string;
  type: string;
  required: boolean;
  children: FieldNode[];
}

interface SchemaVisitor {
  visitElement(element: any, path: string): FieldNode;
  visitChildren(elements: any[], parentPath: string): FieldNode[];
}

class NormalizingVisitor implements SchemaVisitor {
  visitElement(element: any, path: string): FieldNode {
    return {
      id: this.generateId(path),
      name: element.name || element.key,
      path: path,
      type: this.normalizeType(element.type),
      required: element.required ?? false,
      children: this.visitChildren(element.children || [], path)
    };
  }

  visitChildren(elements: any[], parentPath: string): FieldNode[] {
    return elements.map((el, idx) =>
      this.visitElement(el, `${parentPath}.${el.name || idx}`)
    );
  }

  private normalizeType(type: any): string {
    // Map various schema type formats to standard types
    if (typeof type === 'string') return type;
    if (Array.isArray(type)) return type[0]; // JSON Schema allows type arrays
    return 'any';
  }

  private generateId(path: string): string {
    // Generate stable, unique IDs for React keys
    return path.replace(/\./g, '-');
  }
}
```

### Pattern 3: Recursive Schema Inference from Samples

**What:** Infer structure from sample data by recursively traversing and analyzing types

**When to use:** For XML/JSON samples without schemas

**Example:**
```typescript
// Source: Recursive descent parser patterns + structure inference research

class SampleInferenceParser {
  inferStructure(sample: any, path: string = 'root'): FieldNode {
    const type = this.inferType(sample);

    if (type === 'object' && sample !== null) {
      return {
        id: path,
        name: path.split('.').pop() || 'root',
        path,
        type: 'object',
        required: false,
        children: Object.entries(sample).map(([key, value]) =>
          this.inferStructure(value, `${path}.${key}`)
        )
      };
    }

    if (type === 'array' && sample.length > 0) {
      // Infer array item structure from first element
      const itemStructure = this.inferStructure(sample[0], `${path}[]`);
      return {
        id: path,
        name: path.split('.').pop() || 'root',
        path,
        type: 'array',
        required: false,
        children: [itemStructure]
      };
    }

    return {
      id: path,
      name: path.split('.').pop() || 'root',
      path,
      type,
      required: false,
      children: []
    };
  }

  private inferType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    return typeof value;
  }
}
```

### Pattern 4: JSON Schema $ref Resolution

**What:** Dereference JSON Schema $ref pointers before parsing

**When to use:** When JSON schemas use $ref to reference definitions

**Example:**
```typescript
// Source: json-schema-ref-parser documentation

import $RefParser from '@apidevtools/json-schema-ref-parser';

class JsonSchemaParser implements BaseParser {
  readonly format = 'json-schema';

  async parse(content: string): Promise<FieldNode[]> {
    const schema = JSON.parse(content);

    // Dereference all $ref pointers
    const dereferenced = await $RefParser.dereference(schema);

    // Now traverse dereferenced schema
    const visitor = new NormalizingVisitor();
    return this.traverseSchema(dereferenced, visitor);
  }

  private traverseSchema(schema: any, visitor: SchemaVisitor): FieldNode[] {
    if (schema.type === 'object' && schema.properties) {
      const required = new Set(schema.required || []);

      return Object.entries(schema.properties).map(([name, prop]: [string, any]) => {
        const path = name;
        return {
          id: path,
          name,
          path,
          type: prop.type || 'any',
          required: required.has(name),
          children: prop.type === 'object' && prop.properties
            ? this.traverseSchema(prop, visitor)
            : []
        };
      });
    }
    return [];
  }
}
```

### Anti-Patterns to Avoid

- **Client-side XSD parsing:** XSD parsers require native dependencies (libxml). Parse XSD server-side in Next.js API routes, not in browser.
- **Synchronous parsing for large files:** Use async parsing to avoid blocking the event loop. fast-xml-parser and Ajv both support async.
- **Not dereferencing $ref:** JSON Schemas with $ref will have incomplete structures unless you dereference first with json-schema-ref-parser.
- **Ignoring namespaces in XML/XSD:** XML namespaces are critical for correct parsing. fast-xml-parser supports namespace handling—use it.
- **Over-normalization:** Don't split every nested property into separate database records. Keep the field tree in-memory or as JSONB for query performance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom JSON validator | **ajv** | JSON Schema spec has 100+ edge cases (type coercion, formats, $ref resolution, conditional schemas). Ajv handles all of them. |
| XML parsing | Regex-based XML parser | **fast-xml-parser** | XML has entities, CDATA, namespaces, processing instructions, and complex nesting. Hand-rolled parsers miss edge cases. |
| XSD validation | Custom XSD parser | **libxmljs2-xsd** | XSD has complex types, extensions, restrictions, includes, imports, and substitution groups. Requires libxml (C library) for correctness. |
| $ref resolution | Manual $ref traversal | **json-schema-ref-parser** | $ref can be circular, external, or relative. Manual resolution breaks on edge cases and external URLs. |
| File type detection | File extension only | Content + extension analysis | Extensions can be wrong. Check file content (JSON.parse, XML header) to confirm actual format. |
| Tree ID generation | Random IDs | Path-based stable IDs | React needs stable keys for reconciliation. Generate IDs from field paths for consistency across re-parses. |

**Key insight:** Schema parsing is deceptively complex. Each format has decades of accumulated edge cases. Use battle-tested libraries maintained by the community rather than building custom parsers that will break on real-world schemas.

## Common Pitfalls

### Pitfall 1: XSD Parsing in Browser

**What goes wrong:** Attempting to use libxmljs2-xsd or node-libxml-xsd in client-side code causes build failures or runtime errors.

**Why it happens:** These libraries use native Node.js bindings to libxml (C library) which cannot run in browsers.

**How to avoid:**
- Parse XSD schemas server-side in Next.js API routes (`/app/api/parse-schema/route.ts`)
- Send parsed FieldNode[] structure to client as JSON
- Only do client-side parsing for pure JavaScript libraries (Ajv, fast-xml-parser)

**Warning signs:**
- Webpack errors mentioning "node-gyp" or "native modules"
- Runtime errors about missing bindings or .node files

### Pitfall 2: JSON Schema $ref Not Resolved

**What goes wrong:** Parsing a JSON Schema with `$ref` pointers results in incomplete field trees with missing properties.

**Why it happens:** $ref is a JSON Schema feature that references definitions elsewhere. Without dereferencing, you see `{ "$ref": "#/definitions/Address" }` instead of the actual Address structure.

**How to avoid:**
- Always use json-schema-ref-parser's `dereference()` method before parsing
- Handle circular references (set `dereference.circular` option)
- For external $refs (URLs), ensure network access or provide local copies

**Warning signs:**
- Field nodes with `$ref` property in parsed output
- Missing nested properties that should exist
- Empty children arrays for complex types

### Pitfall 3: XML Namespace Handling

**What goes wrong:** XML with namespaces (xmlns) fails to parse correctly, or element names include namespace prefixes incorrectly.

**Why it happens:** XML namespaces map prefixes to URIs. Without proper namespace handling, `<xs:element>` might be treated as element name "xs:element" instead of "element" in the XSD namespace.

**How to avoid:**
- Enable namespace support in fast-xml-parser options: `ignoreNameSpace: false`
- Use `removeNSPrefix: false` to preserve namespace information
- Map namespace URIs to prefixes consistently

**Warning signs:**
- Element names include colons (e.g., "xs:complexType")
- Can't find elements that exist in namespaced XML
- XSD validation fails on valid XML with namespaces

### Pitfall 4: Type Coercion Inconsistencies

**What goes wrong:** Same schema produces different types across parsers (e.g., "string" vs "text", "integer" vs "number").

**Why it happens:** Different schema formats use different type vocabularies. JSON Schema uses "string/number/integer/boolean/null/object/array", XSD uses "xs:string/xs:int/xs:boolean", XML samples have no type information.

**How to avoid:**
- Create a `normalizeType()` function in your visitor pattern
- Map all type strings to a canonical set: `string | number | integer | boolean | object | array | null | any`
- Document type mapping for each parser format

**Warning signs:**
- Type comparisons fail unexpectedly
- UI shows inconsistent type labels
- Validation logic breaks on certain parsers

### Pitfall 5: Memory Issues with Large Files

**What goes wrong:** Parsing a 10MB+ XSD or XML file causes memory errors or browser tab crashes.

**Why it happens:** Parsers load entire file into memory as DOM tree. Large schemas create huge object graphs.

**How to avoid:**
- Set file size limits (recommend 5MB max for browser uploads)
- Use streaming parsers for very large files (though most schema files are small)
- Parse server-side for XSD to keep memory usage off client
- Show file size warnings before parsing

**Warning signs:**
- Browser becomes unresponsive during parsing
- Out of memory errors in Node.js
- Parsing takes >5 seconds

### Pitfall 6: Path Generation Inconsistencies

**What goes wrong:** Field paths differ between parsers, breaking mapping logic that relies on stable paths (e.g., `order.items.0.price` vs `order.items[0].price` vs `order.items[].price`).

**Why it happens:** No standard for representing paths in nested structures. JSON uses bracket notation for arrays, XPath uses different syntax, dot notation varies.

**How to avoid:**
- Define canonical path format upfront (recommend: `parent.child.arrayName[].itemProperty`)
- Implement `generatePath()` helper used by all parsers
- Write tests ensuring paths are identical for equivalent structures across formats

**Warning signs:**
- Mapping connections fail to match between source and target
- React key warnings about changing keys
- Path-based lookups fail

## Code Examples

Verified patterns from official sources and research:

### Example 1: JSON Schema Parser with Ajv

```typescript
// Source: Ajv documentation + JSON Schema $ref resolution research

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import $RefParser from '@apidevtools/json-schema-ref-parser';

interface ParseOptions {
  strict?: boolean;
  allowUnknownFormats?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

class JsonSchemaParser implements BaseParser {
  readonly format = 'json-schema';
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      strict: false,
      allErrors: true
    });
    addFormats(this.ajv);
  }

  async validate(content: string): Promise<ValidationResult> {
    try {
      const schema = JSON.parse(content);

      // Validate that it's a valid JSON Schema
      const isValid = this.ajv.validateSchema(schema);

      return {
        valid: isValid,
        errors: isValid ? undefined : this.ajv.errors?.map(e => e.message) || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Invalid JSON']
      };
    }
  }

  async parse(content: string, options?: ParseOptions): Promise<FieldNode[]> {
    const schema = JSON.parse(content);

    // Dereference all $ref pointers
    const dereferenced = await $RefParser.dereference(schema, {
      dereference: {
        circular: 'ignore' // Handle circular references
      }
    });

    // Parse top-level properties
    if (dereferenced.type === 'object' && dereferenced.properties) {
      return this.parseProperties(dereferenced.properties, dereferenced.required || [], 'root');
    }

    return [];
  }

  private parseProperties(properties: Record<string, any>, required: string[], parentPath: string): FieldNode[] {
    const requiredSet = new Set(required);

    return Object.entries(properties).map(([name, prop]) => {
      const path = parentPath === 'root' ? name : `${parentPath}.${name}`;

      return {
        id: this.generateId(path),
        name,
        path,
        type: this.normalizeType(prop.type),
        required: requiredSet.has(name),
        children: prop.type === 'object' && prop.properties
          ? this.parseProperties(prop.properties, prop.required || [], path)
          : prop.type === 'array' && prop.items && prop.items.properties
          ? this.parseProperties(prop.items.properties, prop.items.required || [], `${path}[]`)
          : []
      };
    });
  }

  private normalizeType(type: string | string[]): string {
    if (Array.isArray(type)) {
      // JSON Schema allows multiple types
      return type.filter(t => t !== 'null')[0] || 'any';
    }
    return type || 'any';
  }

  private generateId(path: string): string {
    return path.replace(/\./g, '-').replace(/\[\]/g, '-array');
  }
}
```

### Example 2: XML Sample Parser with fast-xml-parser

```typescript
// Source: fast-xml-parser documentation + structure inference patterns

import { XMLParser } from 'fast-xml-parser';

class XmlSampleParser implements BaseParser {
  readonly format = 'xml-sample';
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
      ignoreNameSpace: false,
      removeNSPrefix: false
    });
  }

  async validate(content: string): Promise<ValidationResult> {
    try {
      this.parser.parse(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Invalid XML']
      };
    }
  }

  async parse(content: string): Promise<FieldNode[]> {
    const parsed = this.parser.parse(content);

    // XML has single root element
    const rootName = Object.keys(parsed)[0];
    const rootValue = parsed[rootName];

    const rootNode = this.inferStructure(rootValue, rootName);

    return [rootNode];
  }

  private inferStructure(value: any, name: string, path?: string): FieldNode {
    const currentPath = path || name;

    // Handle primitive types
    if (value === null || value === undefined) {
      return this.createNode(name, currentPath, 'null', []);
    }

    if (typeof value !== 'object') {
      return this.createNode(name, currentPath, this.inferPrimitiveType(value), []);
    }

    // Handle arrays (repeated elements)
    if (Array.isArray(value)) {
      const itemStructure = value.length > 0
        ? this.inferStructure(value[0], name, `${currentPath}[]`)
        : this.createNode(name, `${currentPath}[]`, 'any', []);

      return this.createNode(name, currentPath, 'array', [itemStructure]);
    }

    // Handle objects
    const children: FieldNode[] = [];
    const attributes: FieldNode[] = [];

    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('@_')) {
        // XML attribute
        const attrName = key.substring(2);
        attributes.push(
          this.createNode(attrName, `${currentPath}@${attrName}`, this.inferPrimitiveType(val), [])
        );
      } else if (key === '#text') {
        // Text content
        continue; // Handle as node value, not child
      } else {
        // Child element
        children.push(
          this.inferStructure(val, key, `${currentPath}.${key}`)
        );
      }
    }

    return this.createNode(name, currentPath, 'object', [...attributes, ...children]);
  }

  private createNode(name: string, path: string, type: string, children: FieldNode[]): FieldNode {
    return {
      id: this.generateId(path),
      name,
      path,
      type,
      required: false, // Sample data can't determine required fields
      children
    };
  }

  private inferPrimitiveType(value: any): string {
    if (typeof value === 'string') {
      // Try to detect date/datetime formats
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      return 'string';
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (typeof value === 'boolean') return 'boolean';
    return 'any';
  }

  private generateId(path: string): string {
    return path.replace(/\./g, '-').replace(/\[\]/g, '-array').replace(/@/g, 'attr-');
  }
}
```

### Example 3: Next.js API Route for Server-Side XSD Parsing

```typescript
// Source: Next.js documentation + libxmljs2-xsd patterns

// app/api/parse-schema/route.ts
import { NextRequest, NextResponse } from 'next/server';
import xsd from 'libxmljs2-xsd'; // Server-side only!

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parserType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const content = await file.text();

    // Route to appropriate parser
    let fieldNodes: FieldNode[];

    if (parserType === 'xsd') {
      fieldNodes = await parseXsd(content);
    } else if (parserType === 'json-schema') {
      const parser = new JsonSchemaParser();
      fieldNodes = await parser.parse(content);
    } else if (parserType === 'xml-sample') {
      const parser = new XmlSampleParser();
      fieldNodes = await parser.parse(content);
    } else {
      return NextResponse.json({ error: 'Unknown parser type' }, { status: 400 });
    }

    return NextResponse.json({ fieldNodes });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Parse failed' },
      { status: 500 }
    );
  }
}

async function parseXsd(content: string): Promise<FieldNode[]> {
  return new Promise((resolve, reject) => {
    xsd.parseFile(content, (err, schema) => {
      if (err) {
        reject(new Error(`XSD parse error: ${err.message}`));
        return;
      }

      // Extract structure from parsed schema
      // This is complex - XSD schemas are XML themselves
      // You'll need to traverse the schema structure
      // and extract element definitions

      try {
        const fieldNodes = extractFieldsFromXsdSchema(schema);
        resolve(fieldNodes);
      } catch (extractErr) {
        reject(extractErr);
      }
    });
  });
}

// XSD schema extraction is complex - this is simplified
function extractFieldsFromXsdSchema(schema: any): FieldNode[] {
  // TODO: Implement full XSD schema traversal
  // This would parse xs:element, xs:complexType, xs:sequence, etc.
  // For now, returning empty array as placeholder
  return [];
}
```

### Example 4: Client-Side File Upload with Validation

```typescript
// Source: Next.js file upload best practices + Zod validation

'use client';

import { useState } from 'react';
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const fileSchema = z.object({
  name: z.string(),
  size: z.number().max(MAX_FILE_SIZE, 'File must be less than 5MB'),
  type: z.string()
});

export function SchemaUploader() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldTree, setFieldTree] = useState<FieldNode[]>([]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file on client before sending
    try {
      fileSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Detect parser type from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const type = ext === 'xsd' ? 'xsd'
        : ext === 'xml' ? 'xml-sample'
        : ext === 'json' ? 'json-schema'
        : null;

      if (!type) {
        throw new Error('Unsupported file type. Use .xsd, .xml, or .json');
      }

      formData.append('type', type);

      // Send to server-side parser
      const response = await fetch('/api/parse-schema', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parse failed');
      }

      const { fieldNodes } = await response.json();
      setFieldTree(fieldNodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".xsd,.xml,.json"
        onChange={handleUpload}
        disabled={uploading}
      />
      {error && <p className="text-red-500">{error}</p>}
      {uploading && <p>Parsing schema...</p>}
      {fieldTree.length > 0 && (
        <div>
          <h3>Parsed Fields:</h3>
          <FieldTreeView nodes={fieldTree} />
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xml2js for XML parsing | fast-xml-parser | 2020-2021 | 5-10x faster parsing, better async support, cleaner API without callbacks |
| Ajv v6 | Ajv v8 | March 2021 | JSON Schema draft-2020-12 support, dynamic recursive references, better TypeScript integration |
| Manual $ref resolution | json-schema-ref-parser | 2015-ongoing | Handles circular refs, external URLs, and complex $ref patterns automatically |
| Client-side everything | Server-side XSD parsing | Always necessary | XSD requires native libs (libxml) that can't run in browser |
| Joi/Yup for schemas | Zod for TypeScript-first | 2020-2022 | Better type inference, but Ajv still preferred for standard JSON Schema compatibility |

**Deprecated/outdated:**
- **libxmljs** (original): Unmaintained since 2018. Use **libxmljs2** or **libxmljs2-xsd** instead.
- **node-libxml-xsd**: Last updated 2017. Use **libxmljs2-xsd** (actively maintained port).
- **cxsd for runtime parsing**: cxsd generates TypeScript types from XSD but doesn't parse instances. Use libxmljs2-xsd for runtime validation.
- **xml2js**: Still popular but slower than fast-xml-parser and uses callbacks instead of promises.

## Open Questions

### 1. XSD Schema Structure Extraction Complexity

**What we know:** libxmljs2-xsd validates XML against XSD but doesn't directly extract field structure from XSD into a tree.

**What's unclear:** Best approach to traverse XSD schema definitions (xs:element, xs:complexType, xs:sequence, xs:choice, etc.) and extract field structure.

**Recommendation:**
- Option A: Use fast-xml-parser to parse XSD file as XML, then manually traverse xs:element definitions
- Option B: Research if cxsd's internal parser can be used (it parses XSD structure for TypeScript generation)
- Option C: Build custom XSD schema visitor that understands XSD element types

**Action:** Spike in Plan 02-01 to test Option A (parse XSD as XML). If too complex, evaluate Option B (use cxsd as library) or defer full XSD support to later phase.

### 2. JSON Sample vs JSON Schema Detection

**What we know:** Both are valid JSON. JSON Schema typically has `$schema` property, but it's optional.

**What's unclear:** Reliable heuristic to distinguish JSON Schema from JSON sample data.

**Recommendation:**
- Check for `$schema` property (high confidence it's a schema)
- Check for `type`, `properties`, `required` at root level (medium confidence)
- Prompt user to clarify if ambiguous
- Store user's choice to avoid re-asking for same file

### 3. Multi-File Schema Support

**What we know:** Real-world schemas often split across multiple files (XSD includes, JSON Schema $ref to external files).

**What's unclear:** Whether Phase 2 should support multi-file uploads or defer to Phase 7 (Schema Library Management).

**Recommendation:**
- Phase 2: Support single-file schemas with embedded definitions only
- Phase 7: Add multi-file upload and schema library management
- Rationale: Success criteria for Phase 2 mention single file uploads, not multi-file projects

### 4. Error Message User-Friendliness

**What we know:** libxmljs2-xsd validation errors are detailed but hard to parse. Ajv errors are structured but technical.

**What's unclear:** How much error message translation/simplification to implement in Phase 2 vs defer to Phase 6 (Validation & Testing).

**Recommendation:**
- Phase 2: Show raw validation errors (requirement PARS-08 just says "user sees validation errors")
- Phase 6: Improve error messages with user-friendly explanations and line number highlighting
- Rationale: Don't over-engineer Phase 2 beyond success criteria

## Sources

### Primary (HIGH confidence)

- [Ajv JSON schema validator official site](https://ajv.js.org/) - Features, API, TypeScript integration
- [Ajv GitHub repository](https://github.com/ajv-validator/ajv) - Current version (v8), code examples
- [fast-xml-parser GitHub](https://github.com/NaturalIntelligence/fast-xml-parser) - Features, performance, options
- [libxmljs2-xsd npm package](https://www.npmjs.com/package/libxmljs2-xsd) - XSD validation for Node.js
- [json-schema-ref-parser GitHub](https://github.com/APIDevTools/json-schema-ref-parser) - $ref dereferencing

### Secondary (MEDIUM confidence)

- [Factory Registry Pattern in TypeScript](https://medium.com/@lalitpradhan306/factory-registry-pattern-96c97408c971) - Pattern implementation
- [Visitor Pattern in TypeScript](https://refactoring.guru/design-patterns/visitor/typescript/example) - Tree traversal pattern
- [TypeScript Best Practices 2026](https://www.bacancytechnology.com/blog/typescript-best-practices) - Strict mode, type safety
- [Next.js File Upload Best Practices](https://moldstud.com/articles/p-handling-file-uploads-in-nextjs-best-practices-and-security-considerations) - Validation, security
- [Zod vs Ajv comparison](https://www.bitovi.com/blog/comparing-schema-validation-libraries-ajv-joi-yup-and-zod) - Library tradeoffs

### Tertiary (LOW confidence - needs validation)

- [XSD Complex Types tutorial](https://www.w3schools.com/xml/schema_complex.asp) - Basic XSD concepts
- [Recursive descent parser patterns](https://cdiggins.github.io/myna-parser/) - Parser theory
- [XML namespace handling](https://github.com/charto/cxsd) - cxsd namespace support

## Metadata

**Confidence breakdown:**
- JSON Schema parsing: HIGH - Ajv is industry standard, well-documented, verified in production use
- XML sample parsing: HIGH - fast-xml-parser is mature, widely used, good TypeScript support
- XSD schema parsing: MEDIUM - libxmljs2-xsd works but extracting structure (not just validation) is custom work
- Parser architecture: HIGH - Factory + Registry is proven pattern, TypeScript discriminated unions provide type safety
- Next.js integration: MEDIUM - File upload patterns verified, but API route structure is project-specific

**Research date:** 2026-02-11

**Valid until:** March 2026 (30 days for stable ecosystem, but monitor Ajv/fast-xml-parser releases monthly)
