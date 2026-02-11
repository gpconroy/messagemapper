import { describe, it, expect } from '@jest/globals'
import { XsdParser } from '../xsd-parser'

describe('XsdParser', () => {
  const parser = new XsdParser()

  describe('format', () => {
    it('should have correct format type', () => {
      expect(parser.format).toBe('xsd')
    })
  })

  describe('validate', () => {
    it('should validate valid XSD', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order" type="xs:string"/>
        </xs:schema>
      `
      const result = await parser.validate(xsd)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject malformed XML', async () => {
      const invalidXml = '<xs:schema><xs:element' // Unclosed
      const result = await parser.validate(invalidXml)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject XML that is not XSD', async () => {
      const notXsd = '<order><id>123</id></order>'
      const result = await parser.validate(notXsd)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Not a valid XSD schema')
    })
  })

  describe('parse', () => {
    it('should parse simple element with built-in type', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="id" type="xs:int"/>
                <xs:element name="total" type="xs:decimal"/>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      expect(result).toHaveLength(1)
      const root = result[0]
      expect(root.name).toBe('order')
      expect(root.path).toBe('order')
      expect(root.type).toBe('object')
      expect(root.children).toHaveLength(2)

      const id = root.children.find(c => c.name === 'id')
      expect(id?.path).toBe('order.id')
      expect(id?.type).toBe('integer')
      expect(id?.required).toBe(true) // Default minOccurs is 1

      const total = root.children.find(c => c.name === 'total')
      expect(total?.path).toBe('order.total')
      expect(total?.type).toBe('number')
    })

    it('should parse nested complex types', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="customer">
                  <xs:complexType>
                    <xs:sequence>
                      <xs:element name="name" type="xs:string"/>
                      <xs:element name="email" type="xs:string"/>
                    </xs:sequence>
                  </xs:complexType>
                </xs:element>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      expect(result).toHaveLength(1)
      const root = result[0]
      expect(root.name).toBe('order')

      const customer = root.children.find(c => c.name === 'customer')
      expect(customer).toBeDefined()
      expect(customer?.path).toBe('order.customer')
      expect(customer?.type).toBe('object')
      expect(customer?.children).toHaveLength(2)

      const name = customer?.children.find(c => c.name === 'name')
      expect(name?.path).toBe('order.customer.name')
      expect(name?.type).toBe('string')

      const email = customer?.children.find(c => c.name === 'email')
      expect(email?.path).toBe('order.customer.email')
      expect(email?.type).toBe('string')
    })

    it('should handle minOccurs for required fields', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="required" type="xs:string" minOccurs="1"/>
                <xs:element name="optional" type="xs:string" minOccurs="0"/>
                <xs:element name="defaultRequired" type="xs:string"/>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      const required = root.children.find(c => c.name === 'required')
      expect(required?.required).toBe(true)

      const optional = root.children.find(c => c.name === 'optional')
      expect(optional?.required).toBe(false)

      const defaultRequired = root.children.find(c => c.name === 'defaultRequired')
      expect(defaultRequired?.required).toBe(true) // XSD default is minOccurs=1
    })

    it('should handle maxOccurs for array fields', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="item" maxOccurs="unbounded">
                  <xs:complexType>
                    <xs:sequence>
                      <xs:element name="name" type="xs:string"/>
                    </xs:sequence>
                  </xs:complexType>
                </xs:element>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      const item = root.children.find(c => c.name === 'item')
      expect(item?.type).toBe('array')
      expect(item?.path).toBe('order.item')
      expect(item?.children).toHaveLength(1)

      const name = item?.children[0]
      expect(name?.path).toBe('order.item[].name')
      expect(name?.type).toBe('string')
    })

    it('should map XSD types correctly', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="data">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="str" type="xs:string"/>
                <xs:element name="int" type="xs:int"/>
                <xs:element name="integer" type="xs:integer"/>
                <xs:element name="long" type="xs:long"/>
                <xs:element name="decimal" type="xs:decimal"/>
                <xs:element name="float" type="xs:float"/>
                <xs:element name="double" type="xs:double"/>
                <xs:element name="bool" type="xs:boolean"/>
                <xs:element name="date" type="xs:date"/>
                <xs:element name="datetime" type="xs:dateTime"/>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      expect(root.children.find(c => c.name === 'str')?.type).toBe('string')
      expect(root.children.find(c => c.name === 'int')?.type).toBe('integer')
      expect(root.children.find(c => c.name === 'integer')?.type).toBe('integer')
      expect(root.children.find(c => c.name === 'long')?.type).toBe('integer')
      expect(root.children.find(c => c.name === 'decimal')?.type).toBe('number')
      expect(root.children.find(c => c.name === 'float')?.type).toBe('number')
      expect(root.children.find(c => c.name === 'double')?.type).toBe('number')
      expect(root.children.find(c => c.name === 'bool')?.type).toBe('boolean')
      expect(root.children.find(c => c.name === 'date')?.type).toBe('date')
      expect(root.children.find(c => c.name === 'datetime')?.type).toBe('date')
    })

    it('should resolve named complex type references', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="AddressType">
            <xs:sequence>
              <xs:element name="street" type="xs:string"/>
              <xs:element name="city" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
          <xs:element name="order">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="address" type="AddressType"/>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      const address = root.children.find(c => c.name === 'address')
      expect(address?.type).toBe('object')
      expect(address?.path).toBe('order.address')
      expect(address?.children).toHaveLength(2)

      const street = address?.children.find(c => c.name === 'street')
      expect(street?.path).toBe('order.address.street')
      expect(street?.type).toBe('string')

      const city = address?.children.find(c => c.name === 'city')
      expect(city?.path).toBe('order.address.city')
      expect(city?.type).toBe('string')
    })

    it('should handle XSD attributes with @ prefix', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order">
            <xs:complexType>
              <xs:attribute name="currency" type="xs:string" use="required"/>
              <xs:attribute name="id" type="xs:int"/>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      const currency = root.children.find(c => c.path === 'order@currency')
      expect(currency).toBeDefined()
      expect(currency?.name).toBe('currency')
      expect(currency?.type).toBe('string')
      expect(currency?.required).toBe(true)

      const id = root.children.find(c => c.path === 'order@id')
      expect(id?.type).toBe('integer')
      expect(id?.required).toBe(false) // use="optional" is default
    })

    it('should handle xs:choice compositor', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="payment">
            <xs:complexType>
              <xs:choice>
                <xs:element name="creditCard" type="xs:string"/>
                <xs:element name="paypal" type="xs:string"/>
              </xs:choice>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      // xs:choice means any one could appear, so all should be marked optional
      const creditCard = root.children.find(c => c.name === 'creditCard')
      expect(creditCard?.required).toBe(false)

      const paypal = root.children.find(c => c.name === 'paypal')
      expect(paypal?.required).toBe(false)
    })

    it('should respect maxDepth option', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="l1">
            <xs:complexType>
              <xs:sequence>
                <xs:element name="l2">
                  <xs:complexType>
                    <xs:sequence>
                      <xs:element name="l3">
                        <xs:complexType>
                          <xs:sequence>
                            <xs:element name="l4" type="xs:string"/>
                          </xs:sequence>
                        </xs:complexType>
                      </xs:element>
                    </xs:sequence>
                  </xs:complexType>
                </xs:element>
              </xs:sequence>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd, { maxDepth: 2 })

      const l1 = result[0]
      expect(l1.name).toBe('l1')

      const l2 = l1.children[0]
      expect(l2.name).toBe('l2')

      // Should stop at maxDepth=2
      expect(l2.children).toEqual([])
    })

    it('should handle xs:all compositor', async () => {
      const xsd = `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="order">
            <xs:complexType>
              <xs:all>
                <xs:element name="id" type="xs:int"/>
                <xs:element name="total" type="xs:decimal"/>
              </xs:all>
            </xs:complexType>
          </xs:element>
        </xs:schema>
      `
      const result = await parser.parse(xsd)

      const root = result[0]
      expect(root.children).toHaveLength(2)
      expect(root.children.find(c => c.name === 'id')).toBeDefined()
      expect(root.children.find(c => c.name === 'total')).toBeDefined()
    })
  })
})
