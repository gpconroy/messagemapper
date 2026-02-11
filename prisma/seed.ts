import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data (reverse dependency order)
  await prisma.mappingConfig.deleteMany()
  await prisma.formatSchema.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  // Tenant A: Acme Corp
  const tenantA = await prisma.tenant.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
    },
  })

  const userA = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      name: 'Alice Admin',
      role: 'admin',
      tenantId: tenantA.id,
    },
  })

  const workspaceA = await prisma.workspace.create({
    data: {
      name: 'Acme Integrations',
      description: 'ISO20022 to TransferMate mappings',
      tenantId: tenantA.id,
    },
  })

  const schemaA = await prisma.formatSchema.create({
    data: {
      name: 'Acme Custom XML',
      formatType: 'xsd',
      schemaData: { root: 'AcmePayment', fields: ['amount', 'currency', 'date'] },
      tenantId: tenantA.id,
    },
  })

  // Tenant B: Globex Inc
  const tenantB = await prisma.tenant.create({
    data: {
      name: 'Globex Inc',
      slug: 'globex-inc',
    },
  })

  const userB = await prisma.user.create({
    data: {
      email: 'admin@globex.com',
      name: 'Bob Builder',
      role: 'admin',
      tenantId: tenantB.id,
    },
  })

  const workspaceB = await prisma.workspace.create({
    data: {
      name: 'Globex Payments',
      description: 'Payment format mappings',
      tenantId: tenantB.id,
    },
  })

  const schemaB = await prisma.formatSchema.create({
    data: {
      name: 'Globex JSON API',
      formatType: 'json',
      schemaData: { root: 'GlobexPayment', fields: ['total', 'curr', 'timestamp'] },
      tenantId: tenantB.id,
    },
  })

  // Shared library schema (no tenant -- accessible to all)
  const librarySchema = await prisma.formatSchema.create({
    data: {
      name: 'ISO20022 pacs.008',
      formatType: 'xsd',
      version: '2019',
      schemaData: { root: 'Document', namespace: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08' },
      isLibrary: true,
      tenantId: null,
    },
  })

  // Create a mapping config for Tenant A
  await prisma.mappingConfig.create({
    data: {
      name: 'Acme XML to ISO20022',
      description: 'Maps Acme custom payment format to ISO20022 pacs.008',
      mappingData: { mappings: [{ source: 'amount', target: 'InstrAmt' }] },
      status: 'draft',
      workspaceId: workspaceA.id,
      sourceSchemaId: schemaA.id,
      targetSchemaId: librarySchema.id,
      createdById: userA.id,
    },
  })

  console.log('Seed complete:')
  console.log(`  Tenant A: ${tenantA.id} (${tenantA.name})`)
  console.log(`  Tenant B: ${tenantB.id} (${tenantB.name})`)
  console.log(`  Users: ${userA.email}, ${userB.email}`)
  console.log(`  Workspaces: ${workspaceA.name}, ${workspaceB.name}`)
  console.log(`  Schemas: ${schemaA.name}, ${schemaB.name}, ${librarySchema.name}`)
  console.log(`  Mapping configs: 1 (Acme XML to ISO20022)`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
