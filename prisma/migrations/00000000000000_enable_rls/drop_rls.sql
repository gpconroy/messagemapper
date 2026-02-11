-- Drop existing policies if they exist
DROP POLICY IF EXISTS tenant_isolation_policy ON users;
DROP POLICY IF EXISTS tenant_insert_policy ON users;
DROP POLICY IF EXISTS tenant_isolation_policy ON workspaces;
DROP POLICY IF EXISTS tenant_insert_policy ON workspaces;
DROP POLICY IF EXISTS tenant_isolation_policy ON format_schemas;
DROP POLICY IF EXISTS tenant_insert_policy ON format_schemas;
DROP POLICY IF EXISTS tenant_isolation_policy ON mapping_configs;
DROP POLICY IF EXISTS tenant_insert_policy ON mapping_configs;

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE format_schemas DISABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_configs DISABLE ROW LEVEL SECURITY;
