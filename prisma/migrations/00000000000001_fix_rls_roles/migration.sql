-- Fix RLS policies to apply to ALL roles, not just public
-- Neon's neon_superuser and other special roles were bypassing the policies

-- Drop existing policies
DROP POLICY IF EXISTS tenant_isolation_policy ON users;
DROP POLICY IF EXISTS tenant_insert_policy ON users;
DROP POLICY IF EXISTS tenant_isolation_policy ON workspaces;
DROP POLICY IF EXISTS tenant_insert_policy ON workspaces;
DROP POLICY IF EXISTS tenant_isolation_policy ON format_schemas;
DROP POLICY IF EXISTS tenant_insert_policy ON format_schemas;
DROP POLICY IF EXISTS tenant_isolation_policy ON mapping_configs;
DROP POLICY IF EXISTS tenant_insert_policy ON mapping_configs;

-- Recreate policies with TO ALL (applies to all roles including superusers)
-- USERS table
CREATE POLICY tenant_isolation_policy ON users
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY tenant_insert_policy ON users
  FOR INSERT
  TO PUBLIC
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- WORKSPACES table
CREATE POLICY tenant_isolation_policy ON workspaces
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY tenant_insert_policy ON workspaces
  FOR INSERT
  TO PUBLIC
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE));

-- FORMAT_SCHEMAS table
CREATE POLICY tenant_isolation_policy ON format_schemas
  FOR ALL
  TO PUBLIC
  USING (
    "tenantId" = current_setting('app.current_tenant_id', TRUE)
    OR "tenantId" IS NULL
  );

CREATE POLICY tenant_insert_policy ON format_schemas
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', TRUE)
    OR "tenantId" IS NULL
  );

-- MAPPING_CONFIGS table
CREATE POLICY tenant_isolation_policy ON mapping_configs
  FOR ALL
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = mapping_configs."workspaceId"
      AND workspaces."tenantId" = current_setting('app.current_tenant_id', TRUE)
    )
  );

CREATE POLICY tenant_insert_policy ON mapping_configs
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = mapping_configs."workspaceId"
      AND workspaces."tenantId" = current_setting('app.current_tenant_id', TRUE)
    )
  );
