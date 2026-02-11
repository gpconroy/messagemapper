import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Replicate tenantQuery logic from src/lib/rls.ts
async function tenantQuery<T>(
  tenantId: string,
  fn: (db: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`
    return fn(tx as PrismaClient)
  })
}

async function verify() {
  let failures = 0

  // Get tenant IDs from the seeded data
  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } })
  if (tenants.length < 2) {
    console.error('FAIL: Expected at least 2 tenants, found', tenants.length)
    console.error('Run `npx prisma db seed` first.')
    process.exit(1)
  }

  const tenantA = tenants.find(t => t.slug === 'acme-corp')!
  const tenantB = tenants.find(t => t.slug === 'globex-inc')!

  console.log(`Tenant A: ${tenantA.id} (${tenantA.name})`)
  console.log(`Tenant B: ${tenantB.id} (${tenantB.name})`)
  console.log('')

  // ---- TEST 1: Users isolation ----
  const usersA = await tenantQuery(tenantA.id, (db) => db.user.findMany())
  if (usersA.length !== 1 || usersA[0].email !== 'admin@acme.com') {
    console.error(`FAIL: Tenant A users: expected [admin@acme.com], got [${usersA.map(u => u.email)}]`)
    failures++
  } else {
    console.log('PASS: Tenant A sees only its own users')
  }

  const usersB = await tenantQuery(tenantB.id, (db) => db.user.findMany())
  if (usersB.length !== 1 || usersB[0].email !== 'admin@globex.com') {
    console.error(`FAIL: Tenant B users: expected [admin@globex.com], got [${usersB.map(u => u.email)}]`)
    failures++
  } else {
    console.log('PASS: Tenant B sees only its own users')
  }

  // ---- TEST 2: Workspaces isolation ----
  const workspacesA = await tenantQuery(tenantA.id, (db) => db.workspace.findMany())
  if (workspacesA.length !== 1 || workspacesA[0].name !== 'Acme Integrations') {
    console.error(`FAIL: Tenant A workspaces: expected [Acme Integrations], got [${workspacesA.map(w => w.name)}]`)
    failures++
  } else {
    console.log('PASS: Tenant A sees only its own workspaces')
  }

  const workspacesB = await tenantQuery(tenantB.id, (db) => db.workspace.findMany())
  if (workspacesB.length !== 1 || workspacesB[0].name !== 'Globex Payments') {
    console.error(`FAIL: Tenant B workspaces: expected [Globex Payments], got [${workspacesB.map(w => w.name)}]`)
    failures++
  } else {
    console.log('PASS: Tenant B sees only its own workspaces')
  }

  // ---- TEST 3: FormatSchemas isolation + shared library ----
  const schemasA = await tenantQuery(tenantA.id, (db) => db.formatSchema.findMany())
  const schemasANames = schemasA.map(s => s.name).sort()
  // Tenant A should see: own schema + library schema (tenantId=NULL)
  if (schemasA.length !== 2 || !schemasANames.includes('Acme Custom XML') || !schemasANames.includes('ISO20022 pacs.008')) {
    console.error(`FAIL: Tenant A schemas: expected [Acme Custom XML, ISO20022 pacs.008], got [${schemasANames}]`)
    failures++
  } else {
    console.log('PASS: Tenant A sees own schemas + shared library schemas')
  }

  const schemasB = await tenantQuery(tenantB.id, (db) => db.formatSchema.findMany())
  const schemasBNames = schemasB.map(s => s.name).sort()
  // Tenant B should see: own schema + library schema
  if (schemasB.length !== 2 || !schemasBNames.includes('Globex JSON API') || !schemasBNames.includes('ISO20022 pacs.008')) {
    console.error(`FAIL: Tenant B schemas: expected [Globex JSON API, ISO20022 pacs.008], got [${schemasBNames}]`)
    failures++
  } else {
    console.log('PASS: Tenant B sees own schemas + shared library schemas')
  }

  // ---- TEST 4: MappingConfigs isolation (via workspace) ----
  const mappingsA = await tenantQuery(tenantA.id, (db) => db.mappingConfig.findMany())
  if (mappingsA.length !== 1 || mappingsA[0].name !== 'Acme XML to ISO20022') {
    console.error(`FAIL: Tenant A mappings: expected [Acme XML to ISO20022], got [${mappingsA.map(m => m.name)}]`)
    failures++
  } else {
    console.log('PASS: Tenant A sees only its own mapping configs')
  }

  const mappingsB = await tenantQuery(tenantB.id, (db) => db.mappingConfig.findMany())
  if (mappingsB.length !== 0) {
    console.error(`FAIL: Tenant B mappings: expected [], got [${mappingsB.map(m => m.name)}]`)
    failures++
  } else {
    console.log('PASS: Tenant B sees no mapping configs (has none)')
  }

  // ---- TEST 5: Cross-tenant query returns nothing ----
  // Use a fake tenant ID -- should see nothing except library schemas
  const fakeId = '00000000-0000-0000-0000-000000000000'
  const fakeUsers = await tenantQuery(fakeId, (db) => db.user.findMany())
  const fakeWorkspaces = await tenantQuery(fakeId, (db) => db.workspace.findMany())
  const fakeMappings = await tenantQuery(fakeId, (db) => db.mappingConfig.findMany())
  const fakeSchemas = await tenantQuery(fakeId, (db) => db.formatSchema.findMany())

  if (fakeUsers.length !== 0 || fakeWorkspaces.length !== 0 || fakeMappings.length !== 0) {
    console.error(`FAIL: Fake tenant sees data: users=${fakeUsers.length}, workspaces=${fakeWorkspaces.length}, mappings=${fakeMappings.length}`)
    failures++
  } else {
    console.log('PASS: Non-existent tenant sees no user/workspace/mapping data')
  }

  // Fake tenant should still see library schemas
  if (fakeSchemas.length !== 1 || fakeSchemas[0].name !== 'ISO20022 pacs.008') {
    console.error(`FAIL: Fake tenant schemas: expected only [ISO20022 pacs.008], got [${fakeSchemas.map(s => s.name)}]`)
    failures++
  } else {
    console.log('PASS: Non-existent tenant sees only shared library schemas')
  }

  // ---- SUMMARY ----
  console.log('')
  if (failures === 0) {
    console.log('ALL RLS TESTS PASSED -- tenant isolation is working correctly.')
  } else {
    console.error(`${failures} TEST(S) FAILED -- RLS isolation has issues.`)
    process.exit(1)
  }
}

verify()
  .catch((e) => {
    console.error('Verification failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
