# Domain Pitfalls: Visual Message Mapping Platform

**Domain:** Multi-tenant visual message mapping and data integration
**Researched:** 2026-02-11
**Confidence:** LOW (based on training data only - verification tools unavailable)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Storing Mapping Logic as Serialized UI State
**What goes wrong:** Treating the visual canvas as the source of truth by serializing canvas coordinates, connector paths, and UI elements directly into the database. When you need to execute mappings server-side, generate code, or migrate to a new UI framework, the mapping logic is trapped in UI-specific format.

**Why it happens:** It's the easiest initial implementation - just JSON.stringify() the canvas state. Works great for MVP demos but becomes technical debt quickly.

**Consequences:**
- Cannot execute mappings without reconstructing UI
- UI framework changes require data migration
- Server-side execution requires parsing UI coordinates
- Versioning and diffs are impossible (UI state changes don't reflect logic changes)
- Cannot generate executable code or SQL from mappings

**Prevention:**
- Separate concerns: Visual representation vs. logical representation
- Store mappings as directed acyclic graphs (DAGs) with node types and connections
- UI renders from logical model, not vice versa
- Logical model should be executable without UI context
- Example structure:
  ```json
  {
    "nodes": [
      {"id": "n1", "type": "source_field", "schema": "customer", "field": "firstName"},
      {"id": "n2", "type": "transform", "function": "uppercase"},
      {"id": "n3", "type": "target_field", "schema": "output", "field": "FIRST_NAME"}
    ],
    "edges": [
      {"from": "n1", "to": "n2"},
      {"from": "n2", "to": "n3"}
    ],
    "ui_metadata": {
      "n1": {"x": 100, "y": 200},
      "n2": {"x": 300, "y": 200}
    }
  }
  ```

**Detection:**
- Mapping execution requires DOM or canvas APIs
- Cannot write tests without UI framework
- Database schema includes fields like "canvasX", "canvasY" in core mapping tables

**Phase implications:** Must be addressed in Phase 1 (foundation). Changing this later requires data migration for all existing mappings.

---

### Pitfall 2: Parser Extensibility as Afterthought
**What goes wrong:** Hard-coding XML, JSON, CSV parsers directly into the mapping engine. When business needs ISO20022 flavors, SWIFT MT, HL7, EDI X12, or custom formats, you're rewriting core engine code for each addition.

**Why it happens:** Starting with "we only need XML and JSON" seems reasonable. Parser logic gets embedded in field discovery, schema introspection, and validation.

**Consequences:**
- Each new format requires code changes in multiple places
- Cannot deploy format support without full application deployment
- Customers cannot add proprietary formats without vendor involvement
- Parser bugs affect core engine stability
- Testing matrix explodes (every mapping type × every format)

**Prevention:**
- Plugin architecture from day one
- Parser interface defines contract:
  ```typescript
  interface FormatParser {
    id: string;
    name: string;
    fileExtensions: string[];
    detectFormat(sample: Buffer): boolean;
    parseSchema(input: Buffer): SchemaDefinition;
    parseInstance(input: Buffer): Record<string, any>;
    serialize(data: Record<string, any>): Buffer;
    validate(input: Buffer): ValidationResult;
  }
  ```
- Core engine works with normalized SchemaDefinition, never raw formats
- Parsers loaded dynamically (npm packages, uploaded plugins, etc.)
- Each parser is independently testable and versioned

**Detection:**
- Adding CSV support requires changes to mapping execution code
- Format-specific conditionals scattered throughout codebase
- Cannot add format without touching core engine

**Phase implications:** Address in Phase 1 or 2. Foundation phase should define parser interface even if only 2-3 formats implemented initially.

---

### Pitfall 3: Transformation Logic Without Execution Context Isolation
**What goes wrong:** Allowing custom transformation functions (JavaScript eval, Python exec, SQL procedures) to run with shared state or global access. Tenant A's transformation can read tenant B's data, infinite loops crash the server, or malicious code accesses environment variables.

**Why it happens:** eval() and Function() constructors are easy. Sandboxing is hard.

**Consequences:**
- Security breach: tenant data leakage
- Denial of service: while(true) loops
- Resource exhaustion: memory leaks from tenant code
- Cannot safely offer custom transformations
- Auditing and debugging is impossible

**Prevention:**
- VM2, isolated-vm, or WebAssembly sandboxes for user code
- Execution timeouts (kill after N milliseconds)
- Memory limits per execution
- No access to process, require, or global objects
- Whitelisted API surface (only safe functions exposed)
- Consider expression-based DSL instead of full programming language
  ```typescript
  // Safer: Restricted expression language
  "uppercase(trim(source.firstName))"

  // vs. dangerous: Full JavaScript
  "return source.firstName.toUpperCase().trim()"
  ```
- If allowing code, use queue-based execution in isolated worker processes

**Detection:**
- User transformations run in main process
- No timeout mechanism for custom functions
- Can access process.env or require() from transformation code
- No CPU or memory limits

**Phase implications:** Must be in Phase 1 if allowing custom transformations. Cannot retrofit security into an insecure foundation.

---

### Pitfall 4: Schema Version Changes Break Existing Mappings
**What goes wrong:** Customer updates their API schema (adds required field, renames field, changes data type). All existing mappings referencing the old schema fail at runtime. No migration path, no warnings, just broken integrations in production.

**Why it happens:** Treating schemas as static. Storing field references by name without version awareness.

**Consequences:**
- Production integrations break silently
- Customers lose trust (data loss or corruption)
- Support burden: "Why did my mapping stop working?"
- Cannot safely evolve schemas
- Manual remapping work for every schema change

**Prevention:**
- Schema versioning built into data model
  ```sql
  CREATE TABLE schemas (
    id UUID PRIMARY KEY,
    workspace_id UUID,
    name TEXT,
    version INTEGER,
    definition JSONB,
    created_at TIMESTAMP
  );
  CREATE TABLE mappings (
    id UUID PRIMARY KEY,
    source_schema_id UUID REFERENCES schemas(id),
    target_schema_id UUID REFERENCES schemas(id),
    source_schema_version INTEGER,
    target_schema_version INTEGER
  );
  ```
- Mappings reference schema + version, not just schema
- Schema comparison tools detect breaking vs. non-breaking changes
- Migration UI: "Field 'firstName' was renamed to 'first_name'. Update 23 mappings?"
- Warnings when mapping uses deprecated schema version
- Support schema evolution rules (field renames, type widening, etc.)

**Detection:**
- Schema table has no version column
- Mappings reference fields by string name only
- No UI for "this mapping uses an old schema version"
- Schema updates immediately affect all mappings

**Phase implications:** Foundation architecture (Phase 1). Adding versioning after launch requires migrating all existing mappings.

---

### Pitfall 5: N+1 Queries for Large Dataset Transformations
**What goes wrong:** Processing 10,000 row CSV file with lookup table transformations. For each row, code queries database for lookup value. Result: 10,000 database queries, 30+ second execution time, timeouts, and angry users.

**Why it happens:** Implementing transformations as "per-record" functions without considering batch operations.

**Consequences:**
- Unusable performance for real-world data volumes
- Database connection pool exhaustion
- Timeout errors in production
- Cannot process files larger than a few hundred rows
- Customer perception: "This tool doesn't scale"

**Prevention:**
- Batch-aware transformation execution
- Preload lookup tables into memory for transformation run
- Streaming parser with chunked execution (process 1000 rows, commit, repeat)
- SQL generation for database-to-database mappings (push-down execution)
- Performance budgets in tests (e.g., "10K rows must complete in <5 seconds")
- Example pattern:
  ```typescript
  // BAD: Per-record lookup
  for (const row of rows) {
    row.countryName = await db.lookup('countries', row.countryCode);
  }

  // GOOD: Preload lookup table
  const lookupTable = await db.loadLookupTable('countries');
  for (const row of rows) {
    row.countryName = lookupTable.get(row.countryCode);
  }
  ```

**Detection:**
- Database query count scales linearly with input rows
- Single-row processing loops with async database calls inside
- No batch operations in transformation engine
- Performance tests missing or don't use realistic data volumes

**Phase implications:** Address in Phase 2 or 3 (after basic mapping works). Can optimize later but need to be aware of the pattern early.

---

### Pitfall 6: Visual Connector Rendering Kills Browser with Large Schemas
**What goes wrong:** Customer uploads XML schema with 500 fields. Browser renders 500 source boxes + 500 target boxes + potential connectors. SVG path calculations cause 3-second lag on every mouse movement. Browser crashes or becomes unusable.

**Why it happens:** Rendering everything up front. No virtualization. Treating UI like a small demo dataset.

**Consequences:**
- Cannot handle real-world schema complexity
- User experience degrades to unusable
- "Works in demo, fails with customer data"
- Competitors with better UI performance win deals

**Prevention:**
- Virtual scrolling for field lists (only render visible DOM nodes)
- Lazy rendering: collapse nested structures by default
- Search/filter to reduce visible fields
- Canvas viewport culling: only render connectors in visible area
- Use HTML5 Canvas or WebGL for connectors instead of SVG DOM (fewer nodes)
- Pagination or grouping for massive schemas
- Performance budget: 60fps interaction with 1000+ field schemas
- Libraries: react-window, react-virtualized, or custom virtualization

**Detection:**
- Render time increases linearly with schema size
- Browser dev tools show thousands of DOM nodes
- Frame rate drops below 30fps when dragging
- No virtualization in field list components

**Phase implications:** Should be considered in Phase 1 UI design. Fixing later requires UI rewrite.

---

### Pitfall 7: Multi-Tenancy via Application-Level Filtering
**What goes wrong:** Single database with workspace_id column on every table. Application code responsible for adding `WHERE workspace_id = ?` to every query. One missed filter = data leak between tenants. Security by convention, not enforcement.

**Consequences:**
- High-severity data breach risk
- Every query is a potential vulnerability
- Code reviews cannot catch all cases
- ORM queries, raw SQL, admin tools all need filtering
- Regulatory compliance failures (GDPR, SOC2)

**Prevention:**
Option 1: Row-Level Security (PostgreSQL RLS)
```sql
ALTER TABLE mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mappings
  USING (workspace_id = current_setting('app.current_workspace')::uuid);
```
- Set session variable per request
- Database enforces isolation
- Impossible to forget filter

Option 2: Schema-per-tenant
- Each workspace gets dedicated schema (e.g., workspace_abc, workspace_xyz)
- Physical isolation
- Easier backup/restore per tenant
- Connection pooling complexity

Option 3: Database-per-tenant (for high-value customers)
- Ultimate isolation
- Independent scaling
- Higher infrastructure cost

**Detection:**
- workspace_id filtering is manual in code
- No database-level isolation policies
- Single schema for all tenants
- Queries work without workspace_id filter

**Phase implications:** Must be Phase 1 foundation. Cannot retrofit secure multi-tenancy.

---

### Pitfall 8: Circular Dependency Detection Missing from Mapping Validation
**What goes wrong:** User creates mapping where Field A derives from Field B, Field B derives from Field C, Field C derives from Field A. Mapping saves successfully. At execution time: infinite loop, stack overflow, or timeout.

**Why it happens:** Graph validation omitted from initial implementation. Seems unlikely to happen.

**Consequences:**
- Production execution failures
- Wasted compute resources
- Poor user experience (error at runtime, not design time)
- Debugging is difficult (which field caused the loop?)

**Prevention:**
- Topological sort validation on mapping save
- Detect cycles using depth-first search with visited tracking
- Show cycle path in error: "Circular dependency: A → B → C → A"
- Prevent saving invalid mappings (fail fast)
- Visual feedback in UI (highlight cycle in red)
- Example validation:
  ```typescript
  function detectCycle(mapping: Mapping): string[] | null {
    const graph = buildDependencyGraph(mapping);
    const visited = new Set();
    const path: string[] = [];

    function dfs(nodeId: string): boolean {
      if (path.includes(nodeId)) {
        return true; // Cycle detected
      }
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      path.push(nodeId);

      for (const dependency of graph.get(nodeId) || []) {
        if (dfs(dependency)) return true;
      }

      path.pop();
      return false;
    }

    for (const node of graph.keys()) {
      if (dfs(node)) return path;
    }
    return null;
  }
  ```

**Detection:**
- No validation for mapping DAG structure
- Can create self-referential transformations
- Runtime errors instead of design-time errors
- No cycle detection tests

**Phase implications:** Should be in Phase 1 or 2 (whenever transformation dependencies are implemented).

---

## Moderate Pitfalls

### Pitfall 9: No Mapping Execution History or Audit Trail
**What goes wrong:** Mapping runs, produces output, no record of what happened. When output is wrong, cannot determine which mapping version was used, what input values were, or what transformations executed.

**Prevention:**
- Execution log table: mapping_id, version, timestamp, input_hash, output_hash, row_count, duration, errors
- Keep last N execution results for debugging
- Sampling: store first 10 rows of input/output for inspection
- Link to mapping version (not current mapping - it may have changed)

### Pitfall 10: Lookup Tables Without Cache Invalidation Strategy
**What goes wrong:** Customer updates lookup table (country codes, product SKUs). Cached values in mapping execution engine are stale. Output data is incorrect but mappings "work".

**Prevention:**
- Explicit cache invalidation on lookup table updates
- TTL-based cache expiration
- Version-based caching (cache key includes table version)
- UI indication when lookup table has pending changes affecting mappings

### Pitfall 11: No Support for Hierarchical/Nested Data Mapping
**What goes wrong:** User needs to map JSON array to repeated XML elements or vice versa. Flat field-to-field mapping UI cannot express "for each item in array".

**Prevention:**
- Array/repeat operators in transformation model
- Visual UI for expanding arrays (one-to-many connectors)
- Support JSONPath, XPath for nested field selection
- Consider flatten/unflatten transformations

### Pitfall 12: Transformation Testing Requires Full System
**What goes wrong:** To test if uppercase() works, developer must start Next.js app, create workspace, upload schemas, create mapping, execute. 5-minute cycle time for unit-testable logic.

**Prevention:**
- Pure transformation functions extractable for unit tests
- Mock schema definitions in tests
- Transformation library testable independently of UI and database
- Fast feedback loop for transformation development

### Pitfall 13: No Mapping Import/Export Between Workspaces
**What goes wrong:** Customer develops complex mapping in test workspace. Cannot promote to production. Must recreate manually (error-prone, time-consuming).

**Prevention:**
- Export mapping as portable format (JSON with embedded schema definitions)
- Import wizard with schema matching/remapping
- Template library for common mapping patterns
- Workspace-to-workspace copy functionality

### Pitfall 14: Field Data Type Coercion Implicit and Lossy
**What goes wrong:** String "1234" mapped to integer field. Automatic coercion happens silently. Later, "1234abc" maps to integer - what happens? Error? Silent truncation? Undefined behavior?

**Prevention:**
- Explicit type conversion nodes in UI (string-to-int, date parsing, etc.)
- Strict vs. lenient mode option
- Preview shows type mismatches with warnings
- Validation rules configurable per field
- Default to explicit > implicit

### Pitfall 15: Real-Time Preview Executes Transformations on Full Dataset
**What goes wrong:** User changes mapping, UI shows live preview. Behind scenes, system processes entire 100K row file on every keystroke. Server melts.

**Prevention:**
- Preview uses sample data (first 100 rows)
- Debounced execution (wait 500ms after last change)
- Separate preview execution from production execution
- Show "Preview uses sample data" indicator
- Option to run full validation manually

---

## Minor Pitfalls

### Pitfall 16: No Keyboard Shortcuts for Mapping Creation
**What goes wrong:** Power users forced to click through menus for every connection. Slow workflow, RSI risk.

**Prevention:** Tab to next field, Enter to connect, arrow keys to navigate, keyboard-first design.

### Pitfall 17: Connector Lines Overlap and Hard to Distinguish
**What goes wrong:** 50 connectors crossing the canvas look like spaghetti. Cannot trace which source maps to which target.

**Prevention:** Bezier curves, color coding, hover highlighting, connection path animation, "show only connected to X" filter.

### Pitfall 18: Error Messages Expose Internal Schema Names
**What goes wrong:** Error says "foreign key violation in table tenant_workspaces_xf7z". Customer sees database internals, looks unprofessional.

**Prevention:** User-friendly error messages, sanitize database errors, log technical details separately for support.

### Pitfall 19: No Undo/Redo for Mapping Changes
**What goes wrong:** User accidentally deletes 20 connectors. No undo. Starts over or gives up.

**Prevention:** Command pattern, undo/redo stack, Ctrl+Z/Ctrl+Y support, auto-save drafts.

### Pitfall 20: Large File Upload Blocks UI Thread
**What goes wrong:** Upload 50MB CSV file, browser freezes during parsing. User thinks app crashed.

**Prevention:** Web Workers for parsing, progress indicators, chunked uploads, streaming parser.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation/Architecture | Pitfall 1: UI state as mapping logic | Separate logical model from UI representation in data model design |
| Foundation/Architecture | Pitfall 7: Multi-tenancy filtering | Implement Row-Level Security or schema-per-tenant from start |
| Core Mapping Engine | Pitfall 2: Hard-coded parsers | Define parser plugin interface before implementing first parser |
| Transformation System | Pitfall 3: Unsafe execution context | Sandbox user code with VM2/isolated-vm or use DSL instead |
| Schema Management | Pitfall 4: No schema versioning | Add version column to schemas table and mappings reference |
| Performance/Optimization | Pitfall 5: N+1 lookup queries | Batch operations, preload lookups, use performance tests |
| UI/Canvas Development | Pitfall 6: No virtualization | Virtual scrolling and canvas culling from initial UI implementation |
| Validation System | Pitfall 8: No cycle detection | Implement topological sort validation before allowing dependencies |
| Data Execution | Pitfall 10: Lookup cache staleness | Cache invalidation strategy when designing lookup table feature |
| Testing Strategy | Pitfall 12: Transformation testing | Ensure transformation library is independently testable |
| Advanced Features | Pitfall 11: No hierarchical mapping | Plan for array/nested data in mapping model early |

---

## Research Methodology Note

**Confidence Level: LOW**

This research was conducted using training data only (knowledge cutoff: January 2025). Web search and documentation verification tools were unavailable during research. All findings represent common patterns observed in ETL tools, data integration platforms, and visual mapping systems based on:

- Known architectures of tools like Mulesoft, Dell Boomi, Apache NiFi, Talend
- Multi-tenant SaaS platform patterns
- Visual programming and graph-based UI challenges
- Database performance and security best practices

**Recommended validation:**
- Review official documentation for React Flow, React Diagrams, or similar visual canvas libraries
- Research multi-tenant PostgreSQL patterns (Row-Level Security implementations)
- Investigate sandbox solutions (VM2, isolated-vm, QuickJS)
- Study schema versioning approaches in API management tools
- Examine transformation engine architectures in open-source ETL tools

**Sources:** Training data synthesis. No external verification performed.

