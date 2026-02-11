// Re-export types
export type { FieldNode, ParserType, BaseParser, ParseOptions, ValidationResult, ParserResult } from '@/types/parser-types';

// Re-export utilities
export { normalizeType, generatePath, generateId } from './normalize';

// Re-export registry
export { ParserRegistry, parserRegistry } from './registry';

// Import and register all parsers
import { parserRegistry } from './registry';
import { JsonSchemaParser } from './json-schema-parser';
import { JsonSampleParser } from './json-sample-parser';
import { XmlSampleParser } from './xml-sample-parser';
import { XsdParser } from './xsd-parser';

// Register all built-in parsers
parserRegistry.register('json-schema', new JsonSchemaParser());
parserRegistry.register('json-sample', new JsonSampleParser());
parserRegistry.register('xml-sample', new XmlSampleParser());
parserRegistry.register('xsd', new XsdParser());

// Re-export parser classes for direct use if needed
export { JsonSchemaParser, JsonSampleParser, XmlSampleParser, XsdParser };
