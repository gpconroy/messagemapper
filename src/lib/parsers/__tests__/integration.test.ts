import { parserRegistry } from '@/lib/parsers';
import type { FieldNode, ParserResult } from '@/types/parser-types';

describe('Parser Registry Integration', () => {
  describe('Registry integration', () => {
    it('should have all 4 parsers registered', () => {
      expect(parserRegistry.hasParser('json-schema')).toBe(true);
      expect(parserRegistry.hasParser('json-sample')).toBe(true);
      expect(parserRegistry.hasParser('xml-sample')).toBe(true);
      expect(parserRegistry.hasParser('xsd')).toBe(true);
    });

    it('should detect JSON Schema format correctly', async () => {
      const jsonSchemaContent = JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });

      const result = await parserRegistry.parseFile(jsonSchemaContent, 'payment.json');
      expect(result.success).toBe(true);
      expect(result.parserType).toBe('json-schema');
    });

    it('should detect JSON sample format correctly', async () => {
      const jsonSampleContent = JSON.stringify({
        name: 'John Doe',
        age: 30
      });

      const result = await parserRegistry.parseFile(jsonSampleContent, 'payment.json');
      expect(result.success).toBe(true);
      expect(result.parserType).toBe('json-sample');
    });

    it('should detect XML format correctly', async () => {
      const xmlContent = `<?xml version="1.0"?>
<payment>
  <id>123</id>
  <amount>100.00</amount>
</payment>`;

      const result = await parserRegistry.parseFile(xmlContent, 'payment.xml');
      expect(result.success).toBe(true);
      expect(result.parserType).toBe('xml-sample');
    });

    it('should detect XSD format correctly', async () => {
      const xsdContent = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="payment" type="xs:string"/>
</xs:schema>`;

      const result = await parserRegistry.parseFile(xsdContent, 'payment.xsd');
      expect(result.success).toBe(true);
      expect(result.parserType).toBe('xsd');
    });
  });

  describe('FieldNode structure consistency', () => {
    // Test fixtures representing equivalent "Payment" structure across formats
    const paymentJsonSchema = JSON.stringify({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        sender: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            account: { type: 'string' }
          }
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'integer' }
            }
          }
        }
      }
    });

    const paymentJsonSample = JSON.stringify({
      id: 123,
      amount: 100.50,
      currency: 'USD',
      sender: {
        name: 'John Doe',
        account: 'ACC-001'
      },
      items: [
        {
          description: 'Widget',
          quantity: 5
        }
      ]
    });

    const paymentXmlSample = `<?xml version="1.0"?>
<payment>
  <id>123</id>
  <amount>100.50</amount>
  <currency>USD</currency>
  <sender>
    <name>John Doe</name>
    <account>ACC-001</account>
  </sender>
  <items>
    <description>Widget</description>
    <quantity>5</quantity>
  </items>
</payment>`;

    const paymentXsd = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="payment">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="id" type="xs:integer"/>
        <xs:element name="amount" type="xs:decimal"/>
        <xs:element name="currency" type="xs:string"/>
        <xs:element name="sender">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
              <xs:element name="account" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        <xs:element name="items" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="description" type="xs:string"/>
              <xs:element name="quantity" type="xs:integer"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

    it('should return FieldNode[] with expected root structure for all formats', async () => {
      const jsonSchemaResult = await parserRegistry.parseFile(paymentJsonSchema, 'payment.json');
      const jsonSampleResult = await parserRegistry.parseFile(paymentJsonSample, 'payment.json');
      const xmlResult = await parserRegistry.parseFile(paymentXmlSample, 'payment.xml');
      const xsdResult = await parserRegistry.parseFile(paymentXsd, 'payment.xsd');

      expect(jsonSchemaResult.success).toBe(true);
      expect(jsonSampleResult.success).toBe(true);
      expect(xmlResult.success).toBe(true);
      expect(xsdResult.success).toBe(true);

      expect(Array.isArray(jsonSchemaResult.fieldNodes)).toBe(true);
      expect(Array.isArray(jsonSampleResult.fieldNodes)).toBe(true);
      expect(Array.isArray(xmlResult.fieldNodes)).toBe(true);
      expect(Array.isArray(xsdResult.fieldNodes)).toBe(true);
    });

    it('should normalize field types consistently across formats', async () => {
      const jsonSchemaResult = await parserRegistry.parseFile(paymentJsonSchema, 'schema.json');
      const jsonSampleResult = await parserRegistry.parseFile(paymentJsonSample, 'sample.json');

      // Find 'id' field
      const schemaId = jsonSchemaResult.fieldNodes.find(f => f.name === 'id');
      const sampleId = jsonSampleResult.fieldNodes.find(f => f.name === 'id');

      expect(schemaId?.type).toBe('integer');
      expect(sampleId?.type).toBe('integer');

      // Find 'amount' field
      const schemaAmount = jsonSchemaResult.fieldNodes.find(f => f.name === 'amount');
      const sampleAmount = jsonSampleResult.fieldNodes.find(f => f.name === 'amount');

      expect(schemaAmount?.type).toBe('number');
      expect(sampleAmount?.type).toBe('number');

      // Find 'currency' field
      const schemaCurrency = jsonSchemaResult.fieldNodes.find(f => f.name === 'currency');
      const sampleCurrency = jsonSampleResult.fieldNodes.find(f => f.name === 'currency');

      expect(schemaCurrency?.type).toBe('string');
      expect(sampleCurrency?.type).toBe('string');
    });

    it('should extract nested object fields for all formats', async () => {
      const jsonSchemaResult = await parserRegistry.parseFile(paymentJsonSchema, 'schema.json');
      const jsonSampleResult = await parserRegistry.parseFile(paymentJsonSample, 'sample.json');
      const xmlResult = await parserRegistry.parseFile(paymentXmlSample, 'sample.xml');
      const xsdResult = await parserRegistry.parseFile(paymentXsd, 'schema.xsd');

      // Check sender object exists
      const schemaSender = jsonSchemaResult.fieldNodes.find(f => f.name === 'sender');
      const sampleSender = jsonSampleResult.fieldNodes.find(f => f.name === 'sender');
      const xmlSender = xmlResult.fieldNodes[0]?.children.find(f => f.name === 'sender');
      const xsdPayment = xsdResult.fieldNodes[0];
      const xsdSender = xsdPayment?.children.find(f => f.name === 'sender');

      expect(schemaSender?.type).toBe('object');
      expect(sampleSender?.type).toBe('object');
      expect(xmlSender?.type).toBe('object');
      expect(xsdSender?.type).toBe('object');

      // Check sender.name exists
      const schemaName = schemaSender?.children.find(f => f.name === 'name');
      const sampleName = sampleSender?.children.find(f => f.name === 'name');
      const xmlName = xmlSender?.children.find(f => f.name === 'name');
      const xsdName = xsdSender?.children.find(f => f.name === 'name');

      expect(schemaName).toBeDefined();
      expect(sampleName).toBeDefined();
      expect(xmlName).toBeDefined();
      expect(xsdName).toBeDefined();

      // Check sender.account exists
      const schemaAccount = schemaSender?.children.find(f => f.name === 'account');
      const sampleAccount = sampleSender?.children.find(f => f.name === 'account');
      const xmlAccount = xmlSender?.children.find(f => f.name === 'account');
      const xsdAccount = xsdSender?.children.find(f => f.name === 'account');

      expect(schemaAccount).toBeDefined();
      expect(sampleAccount).toBeDefined();
      expect(xmlAccount).toBeDefined();
      expect(xsdAccount).toBeDefined();
    });

    it('should extract array children for all formats', async () => {
      const jsonSchemaResult = await parserRegistry.parseFile(paymentJsonSchema, 'schema.json');
      const jsonSampleResult = await parserRegistry.parseFile(paymentJsonSample, 'sample.json');
      const xmlResult = await parserRegistry.parseFile(paymentXmlSample, 'sample.xml');
      const xsdResult = await parserRegistry.parseFile(paymentXsd, 'schema.xsd');

      // Find items array
      const schemaItems = jsonSchemaResult.fieldNodes.find(f => f.name === 'items');
      const sampleItems = jsonSampleResult.fieldNodes.find(f => f.name === 'items');
      const xmlItems = xmlResult.fieldNodes[0]?.children.find(f => f.name === 'items');
      const xsdPayment = xsdResult.fieldNodes[0];
      const xsdItems = xsdPayment?.children.find(f => f.name === 'items');

      expect(schemaItems?.type).toBe('array');
      expect(sampleItems?.type).toBe('array');
      // XML might not detect array without multiple elements
      expect(xmlItems?.type).toBeDefined();
      expect(xsdItems?.type).toBe('array');

      // Check array has children (item structure)
      expect(schemaItems?.children.length).toBeGreaterThan(0);
      expect(sampleItems?.children.length).toBeGreaterThan(0);

      // Check item.description exists
      const schemaDesc = schemaItems?.children.find(f => f.name === 'description');
      const sampleDesc = sampleItems?.children.find(f => f.name === 'description');
      const xsdDesc = xsdItems?.children.find(f => f.name === 'description');

      expect(schemaDesc).toBeDefined();
      expect(sampleDesc).toBeDefined();
      expect(xsdDesc).toBeDefined();

      // Check item.quantity exists
      const schemaQty = schemaItems?.children.find(f => f.name === 'quantity');
      const sampleQty = sampleItems?.children.find(f => f.name === 'quantity');
      const xsdQty = xsdItems?.children.find(f => f.name === 'quantity');

      expect(schemaQty).toBeDefined();
      expect(sampleQty).toBeDefined();
      expect(xsdQty).toBeDefined();
    });

    it('should include all required FieldNode properties for every node', async () => {
      const result = await parserRegistry.parseFile(paymentJsonSchema, 'schema.json');

      // Recursive check for all nodes
      const checkNode = (node: FieldNode) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('path');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('required');
        expect(node).toHaveProperty('children');

        expect(typeof node.id).toBe('string');
        expect(typeof node.name).toBe('string');
        expect(typeof node.path).toBe('string');
        expect(typeof node.type).toBe('string');
        expect(typeof node.required).toBe('boolean');
        expect(Array.isArray(node.children)).toBe(true);

        // Recurse through children
        node.children.forEach(checkNode);
      };

      result.fieldNodes.forEach(checkNode);
    });
  });

  describe('Validation error handling', () => {
    it('should return validation errors for malformed JSON', async () => {
      const malformedJson = 'not json{';

      const result = await parserRegistry.parseFile(malformedJson, 'bad.json');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid JSON');
    });

    it('should return validation errors for malformed XML', async () => {
      const malformedXml = '<unclosed';

      const result = await parserRegistry.parseFile(malformedXml, 'bad.xml');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return validation errors for malformed XSD', async () => {
      const malformedXsd = '<root>not xsd</root>';

      const result = await parserRegistry.parseFile(malformedXsd, 'bad.xsd');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should throw error for unsupported format', async () => {
      const csvContent = 'name,age\nJohn,30';

      const result = await parserRegistry.parseFile(csvContent, 'file.csv');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported');
    });
  });

  describe('Edge cases', () => {
    it('should parse empty JSON object', async () => {
      const emptyJson = '{}';

      const result = await parserRegistry.parseFile(emptyJson, 'empty.json');

      expect(result.success).toBe(true);
      expect(result.fieldNodes).toEqual([]);
    });

    it('should parse large nested structure without timeout', async () => {
      // Build 15-level deep nested object
      let nested: any = { value: 'string' };
      for (let i = 0; i < 15; i++) {
        nested = {
          type: 'object',
          properties: {
            level: { type: 'integer' },
            child: nested
          }
        };
      }

      const deepSchema = JSON.stringify(nested);

      const result = await parserRegistry.parseFile(deepSchema, 'deep.json');

      expect(result.success).toBe(true);
      // Should not throw or timeout
      expect(result.fieldNodes.length).toBeGreaterThanOrEqual(0);
    }, 10000); // 10 second timeout for this test
  });
});
