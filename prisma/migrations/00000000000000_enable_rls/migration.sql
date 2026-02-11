-- Enable Row-Level Security on all tenant-scoped tables
-- The tenants table itself does NOT need RLS (root entity, accessed by direct ID lookup)

-- ============================================================
-- USERS table: scoped by tenant_id column (mapped from tenantId)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON users
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY tenant_insert_policy ON users
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- ============================================================
-- WORKSPACES table: scoped by tenant_id column
-- ============================================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON workspaces
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY tenant_insert_policy ON workspaces
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- ============================================================
-- FORMAT_SCHEMAS table: scoped by tenant_id column
-- Note: tenantId is nullable (NULL = shared library schema, accessible to all)
-- Policy allows access if: tenant matches OR schema is a library schema (tenantId IS NULL)
-- ============================================================
ALTER TABLE format_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE format_schemas FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON format_schemas
  USING (
    "tenantId" = current_setting('app.current_tenant_id', TRUE)
    OR "tenantId" IS NULL
  );

CREATE POLICY tenant_insert_policy ON format_schemas
  FOR INSERT
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', TRUE)
    OR "tenantId" IS NULL
  );

-- ============================================================
-- MAPPING_CONFIGS table: scoped via workspace -> tenant chain
-- MappingConfig does not have a direct tenantId column.
-- It is scoped through its workspace's tenantId.
-- The subquery checks workspace ownership. This is acceptable
-- because workspaceId is indexed and the subquery hits a PK lookup.
-- ============================================================
ALTER TABLE mapping_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON mapping_configs
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = mapping_configs."workspaceId"
      AND workspaces."tenantId" = current_setting('app.current_tenant_id', TRUE)
    )
  );

CREATE POLICY tenant_insert_policy ON mapping_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = mapping_configs."workspaceId"
      AND workspaces."tenantId" = current_setting('app.current_tenant_id', TRUE)
    )
  );
