import { describe, it, expect } from '@jest/globals'
import { XmlSampleParser } from '../xml-sample-parser'

describe('XmlSampleParser', () => {
  const parser = new XmlSampleParser()

  describe('parse', () => {
    it('should parse simple flat XML', async () => {
      const xml = '<order><id>123</id><total>99.99</total></order>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      const orderField = result[0]
      expect(orderField.name).toBe('order')
      expect(orderField.type).toBe('object')
      expect(orderField.path).toBe('order')
      expect(orderField.children).toHaveLength(2)

      const idField = orderField.children.find(f => f.name === 'id')
      expect(idField?.path).toBe('order.id')
      expect(idField?.type).toBe('integer')

      const totalField = orderField.children.find(f => f.name === 'total')
      expect(totalField?.path).toBe('order.total')
      expect(totalField?.type).toBe('number')
    })

    it('should parse nested elements', async () => {
      const xml = '<order><customer><name>John</name><email>j@test.com</email></customer></order>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      const orderField = result[0]
      expect(orderField.name).toBe('order')
      expect(orderField.children).toHaveLength(1)

      const customerField = orderField.children[0]
      expect(customerField.name).toBe('customer')
      expect(customerField.type).toBe('object')
      expect(customerField.path).toBe('order.customer')
      expect(customerField.children).toHaveLength(2)

      const nameField = customerField.children.find(f => f.name === 'name')
      expect(nameField?.path).toBe('order.customer.name')
      expect(nameField?.type).toBe('string')

      const emailField = customerField.children.find(f => f.name === 'email')
      expect(emailField?.path).toBe('order.customer.email')
      expect(emailField?.type).toBe('string')
    })

    it('should parse XML attributes with @ prefix', async () => {
      const xml = '<order id="123" currency="EUR"><total>99.99</total></order>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      const orderField = result[0]
      expect(orderField.name).toBe('order')
      expect(orderField.children).toHaveLength(3)

      const idAttr = orderField.children.find(f => f.name === 'id' && f.path.includes('@'))
      expect(idAttr?.path).toBe('order@id')
      expect(idAttr?.type).toBe('integer')

      const currencyAttr = orderField.children.find(f => f.name === 'currency' && f.path.includes('@'))
      expect(currencyAttr?.path).toBe('order@currency')
      expect(currencyAttr?.type).toBe('string')

      const totalField = orderField.children.find(f => f.name === 'total' && !f.path.includes('@'))
      expect(totalField?.path).toBe('order.total')
      expect(totalField?.type).toBe('number')
    })

    it('should detect repeated elements as arrays', async () => {
      const xml = '<order><item><name>Widget</name></item><item><name>Gadget</name></item></order>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      const orderField = result[0]
      expect(orderField.children).toHaveLength(1)

      const itemField = orderField.children[0]
      expect(itemField.name).toBe('item')
      expect(itemField.type).toBe('array')
      expect(itemField.path).toBe('order.item')
      expect(itemField.children).toHaveLength(1)

      const nameField = itemField.children[0]
      expect(nameField.name).toBe('name')
      expect(nameField.path).toBe('order.item[].name')
      expect(nameField.type).toBe('string')
    })

    it('should handle mixed content with text and children', async () => {
      const xml = '<note><to>User</to><body>Hello</body></note>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      const noteField = result[0]
      expect(noteField.name).toBe('note')
      expect(noteField.type).toBe('object')
      expect(noteField.children).toHaveLength(2)

      expect(noteField.children.find(f => f.name === 'to')?.type).toBe('string')
      expect(noteField.children.find(f => f.name === 'body')?.type).toBe('string')
    })

    it('should handle namespace-prefixed elements', async () => {
      const xml = '<ns:order xmlns:ns="http://example.com"><ns:id>123</ns:id></ns:order>'

      const result = await parser.parse(xml)

      // With removeNSPrefix: true, namespace prefixes should be stripped
      expect(result).toHaveLength(1)
      const orderField = result[0]
      expect(orderField.name).toBe('order')
      expect(orderField.children).toHaveLength(1)

      const idField = orderField.children[0]
      expect(idField.name).toBe('id')
      expect(idField.path).toBe('order.id')
    })

    it('should handle empty elements', async () => {
      const xml = '<order><notes/></order>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      const orderField = result[0]
      expect(orderField.children).toHaveLength(1)

      const notesField = orderField.children[0]
      expect(notesField.name).toBe('notes')
      expect(notesField.type).toBe('any')
      expect(notesField.children).toHaveLength(0)
    })

    it('should infer types from values', async () => {
      const xml = `
        <data>
          <str>hello</str>
          <int>42</int>
          <float>3.14</float>
          <bool>true</bool>
          <date>2024-01-15</date>
          <datetime>2024-01-15T10:30:00Z</datetime>
        </data>
      `

      const result = await parser.parse(xml)

      const dataField = result[0]
      expect(dataField.children.find(f => f.name === 'str')?.type).toBe('string')
      expect(dataField.children.find(f => f.name === 'int')?.type).toBe('integer')
      expect(dataField.children.find(f => f.name === 'float')?.type).toBe('number')
      expect(dataField.children.find(f => f.name === 'bool')?.type).toBe('boolean')
      expect(dataField.children.find(f => f.name === 'date')?.type).toBe('date')
      expect(dataField.children.find(f => f.name === 'datetime')?.type).toBe('date')
    })

    it('should return empty array for empty root', async () => {
      const xml = '<root></root>'

      const result = await parser.parse(xml)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('root')
      expect(result[0].children).toHaveLength(0)
    })

    it('should respect maxDepth option', async () => {
      const xml = '<l1><l2><l3><l4>deep</l4></l3></l2></l1>'

      const result = await parser.parse(xml, { maxDepth: 2 })

      const l1 = result[0]
      expect(l1.name).toBe('l1')

      const l2 = l1.children[0]
      expect(l2.name).toBe('l2')

      // Should stop at maxDepth
      expect(l2.children).toHaveLength(0)
    })
  })

  describe('validate', () => {
    it('should validate valid XML', async () => {
      const xml = '<order><id>123</id></order>'

      const result = await parser.validate(xml)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for malformed XML', async () => {
      const invalidXml = '<order><id>123</order>' // Unclosed id tag

      const result = await parser.validate(invalidXml)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return errors for invalid XML structure', async () => {
      const invalidXml = 'not xml at all'

      const result = await parser.validate(invalidXml)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  it('should have format property set to xml-sample', () => {
    expect(parser.format).toBe('xml-sample')
  })
})
