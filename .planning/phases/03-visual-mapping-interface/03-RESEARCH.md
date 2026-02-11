# Phase 3: Visual Mapping Interface - Research

**Researched:** 2026-02-11
**Domain:** React Flow - Node-based visual mapping interfaces
**Confidence:** HIGH

## Summary

React Flow (@xyflow/react v12) is the industry-standard library for building node-based visual mapping interfaces in React. It provides built-in drag-and-drop, connection handling, zoom/pan, and extensive customization capabilities. The library has 35.1K GitHub stars, 4.10M weekly npm installs, and is battle-tested by companies like Stripe and Typeform.

For a field mapping interface with side-by-side panels, the recommended architecture uses React Flow for connection handling combined with a tree view component for hierarchical field structures. Custom nodes render field trees with expand/collapse capabilities, while React Flow manages the visual connections between source and target fields. State should be managed using React Flow's built-in `useNodesState` and `useEdgesState` hooks for simple cases, or Zustand for more complex state requirements.

The critical insight: don't build custom drag-and-drop or connection rendering from scratch. React Flow handles the complex edge cases (hit detection, connection validation, viewport transforms, performance optimization) that would take months to implement correctly.

**Primary recommendation:** Use @xyflow/react 12.x with custom nodes, controlled flow state management, and Next.js 15 App Router with 'use client' directive for client-side rendering.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.0 | Node-based UI framework for visual connections | Industry standard for flowchart/mapping UIs - 4.10M weekly installs, maintained by xyflow team, MIT licensed |
| React | 19.x | UI framework | Already in project stack |
| TypeScript | 5.x | Type safety | React Flow has excellent TypeScript support with comprehensive type definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-virtual | latest | Virtualize long field lists | When dealing with schemas >100 fields for performance |
| zustand | latest | State management (if needed) | React Flow uses Zustand internally - use for complex state beyond useNodesState/useEdgesState |
| dagre | latest | Auto-layout algorithm | Optional: for automatic tree positioning if not using manual layouts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Flow | JsPlumb Toolkit | Commercial licensing required for advanced features, more complex API |
| React Flow | JointJS | SVG-based (React Flow uses HTML), steeper learning curve, commercial licensing |
| React Flow | Custom solution | Months of development for edge cases React Flow already solves |
| @tanstack/react-virtual | react-window | React-window is stable but less actively maintained, TanStack Virtual is more modern |

**Installation:**
```bash
npm install @xyflow/react
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/mapper/
├── components/
│   ├── MappingCanvas.tsx          # Main ReactFlow wrapper component
│   ├── FieldTreeNode.tsx          # Custom node for field tree rendering
│   ├── MappingEdge.tsx            # Custom edge (optional styling)
│   └── FieldTreeItem.tsx          # Recursive tree item component
├── hooks/
│   ├── useMappingState.ts         # Centralized mapping state management
│   └── useFieldTree.ts            # Field tree expansion/collapse logic
├── lib/
│   ├── validation.ts              # Connection validation rules
│   └── mappingPersistence.ts      # Save/restore mapping state
└── page.tsx                       # Route with 'use client' directive
```

### Pattern 1: Client-Side Only Component (Required for React Flow)
**What:** React Flow requires browser APIs (ResizeObserver, DOM measurements) and cannot run in SSR
**When to use:** Always with React Flow in Next.js App Router
**Example:**
```typescript
// src/app/mapper/page.tsx
'use client';

import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function MapperPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={nodes} edges={edges}>
        {/* ... */}
      </ReactFlow>
    </div>
  );
}
```

### Pattern 2: Controlled Flow with State Hooks
**What:** Use React Flow's built-in hooks to manage nodes and edges state
**When to use:** Standard approach for most mapping interfaces
**Example:**
```typescript
// Source: https://reactflow.dev/api-reference/hooks/use-nodes-state
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';

function MappingCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    />
  );
}
```

### Pattern 3: Custom Nodes with Handles
**What:** Create custom node components with Handle components for connection points
**When to use:** Always - default nodes are not production-ready
**Example:**
```typescript
// Source: https://reactflow.dev/learn/customization/custom-nodes
import { Handle, Position } from '@xyflow/react';

function FieldTreeNode({ data }) {
  return (
    <div className="field-tree-node">
      <Handle type="target" position={Position.Left} />
      <div>{data.label}</div>
      {data.children && (
        <ul>
          {data.children.map(child => (
            <li key={child.id}>{child.name}</li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { fieldTree: FieldTreeNode };

<ReactFlow nodeTypes={nodeTypes} />
```

### Pattern 4: Connection Validation
**What:** Validate connections to prevent invalid mappings (self-connections, cycles, type mismatches)
**When to use:** Always - prevent user from creating invalid mappings
**Example:**
```typescript
// Source: https://reactflow.dev/examples/interaction/validation
// Source: https://reactflow.dev/examples/interaction/prevent-cycles
const isValidConnection = useCallback(
  (connection) => {
    // Prevent self-connections
    if (connection.target === connection.source) return false;

    // Prevent cycles using depth-first search
    const nodes = getNodes();
    const edges = getEdges();
    const target = nodes.find((node) => node.id === connection.target);

    const hasCycle = (node, visited = new Set()) => {
      if (visited.has(node.id)) return false;
      visited.add(node.id);

      for (const outgoer of getOutgoers(node, nodes, edges)) {
        if (outgoer.id === connection.source) return true;
        if (hasCycle(outgoer, visited)) return true;
      }
    };

    return !hasCycle(target);
  },
  [getNodes, getEdges]
);

<ReactFlow isValidConnection={isValidConnection} />
```

### Pattern 5: Save and Restore Mappings
**What:** Persist mapping state to database or localStorage
**When to use:** Required for saving user work
**Example:**
```typescript
// Source: https://reactflow.dev/examples/interaction/save-and-restore
import { useReactFlow } from '@xyflow/react';

function useMappingPersistence() {
  const { toObject, setNodes, setEdges, setViewport } = useReactFlow();

  const saveMapping = async (mappingId: string) => {
    const flow = toObject();
    const flowData = JSON.stringify(flow);
    // Save to database via API
    await fetch('/api/mappings', {
      method: 'POST',
      body: JSON.stringify({ id: mappingId, data: flowData })
    });
  };

  const loadMapping = async (mappingId: string) => {
    const response = await fetch(`/api/mappings/${mappingId}`);
    const { data } = await response.json();
    const flow = JSON.parse(data);

    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setViewport(flow.viewport || { x: 0, y: 0, zoom: 1 });
  };

  return { saveMapping, loadMapping };
}
```

### Pattern 6: TypeScript Typing for Custom Nodes
**What:** Type-safe custom nodes with data interfaces
**When to use:** Always in TypeScript projects
**Example:**
```typescript
// Source: https://reactflow.dev/learn/advanced-use/typescript
import { Node, NodeProps } from '@xyflow/react';

interface FieldData {
  name: string;
  path: string;
  type: string;
  required: boolean;
  children?: FieldData[];
}

type FieldNode = Node<FieldData, 'field'>;

function FieldTreeNode({ data }: NodeProps<FieldNode>) {
  return (
    <div>
      <strong>{data.name}</strong>
      <span>{data.type}</span>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Accessing entire nodes/edges arrays in render:** Causes re-renders on every position change. Use selectors with `useStore` instead
- **Mutating nodes/edges directly:** React Flow v12 requires spread syntax for updates, not direct mutation
- **Using React Flow without 'use client' in Next.js:** Will cause SSR hydration errors
- **Not memoizing validation functions:** Pass memoized functions to ReactFlow props for performance
- **Building custom connection rendering:** Use React Flow's built-in edge system, don't render SVG paths manually

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop connections | Custom mouse event handlers with SVG path calculation | React Flow edges and handles | Edge cases: viewport transforms, hit detection, connection snapping, touch support, accessibility |
| Node positioning | Manual absolute positioning with CSS | React Flow nodes with position props | Handles coordinate systems, viewport transforms, zoom/pan automatically |
| Connection validation | Post-creation validation with alerts | `isValidConnection` prop | Prevents invalid connections before creation, better UX |
| Cycle detection | Custom graph traversal | React Flow's `getOutgoers` utility | Already optimized, tested, handles edge cases |
| Save/restore state | Custom serialization logic | React Flow's `toObject()` and state setters | Handles viewport, nodes, edges, and internal state correctly |
| Large list rendering | Rendering all fields at once | @tanstack/react-virtual | Prevents performance degradation with 100+ fields |
| Tree expansion state | Custom expand/collapse logic per node | Dedicated state management hook | React Flow nodes re-render frequently, separate tree state from node state |

**Key insight:** Visual mapping interfaces have deceptively complex requirements. Connection hit detection alone requires handling Bezier curve mathematics, viewport transformations, and edge cases like overlapping paths. React Flow has solved these problems over years of production use. Building custom will result in months of bug fixes for edge cases users will immediately discover.

## Common Pitfalls

### Pitfall 1: SSR/Hydration Errors in Next.js
**What goes wrong:** React Flow requires browser APIs (ResizeObserver, DOM measurements). Attempting to render server-side causes "ResizeObserver is not defined" errors.
**Why it happens:** Next.js App Router components are Server Components by default. React Flow needs client-side rendering.
**How to avoid:** Add 'use client' directive at top of component file. Import React Flow CSS in client component, not layout.
**Warning signs:** Errors mentioning ResizeObserver, getBoundingClientRect, or hydration mismatches.

### Pitfall 2: Performance Degradation from State Updates
**What goes wrong:** Flow becomes laggy when dragging nodes or panning viewport.
**Why it happens:** Accessing entire nodes/edges arrays causes re-renders on every position change. Not memoizing callbacks causes prop changes.
**How to avoid:** Use `useStore` with selectors for specific values. Memoize all callback props with `useCallback`. Don't access nodes/edges in render unless necessary.
**Warning signs:** Dragging feels sluggish, console shows many re-renders, React DevTools Profiler shows high render times.

### Pitfall 3: Lost Mapping State on Edge Deletion
**What goes wrong:** User deletes edge but mapping metadata (transformations, notes) persists, causing data inconsistency.
**Why it happens:** Edge deletion only updates edges array, not external mapping state.
**How to avoid:** Use `onEdgesDelete` callback to clean up associated metadata. Store mapping metadata by edge ID for easy cleanup.
**Warning signs:** Orphaned data in mapping configuration, errors when loading saved mappings.

### Pitfall 4: Invalid Connections Allowed
**What goes wrong:** Users create self-connections or circular mappings that break execution.
**Why it happens:** No validation on `onConnect` callback.
**How to avoid:** Implement `isValidConnection` with checks for self-connections and cycles using `getOutgoers` utility.
**Warning signs:** Users report "infinite loop" errors, mapping execution hangs.

### Pitfall 5: Testing Failures
**What goes wrong:** Jest tests fail with "ResizeObserver is not defined" or "offsetHeight is not available".
**Why it happens:** React Flow relies on browser APIs not available in jsdom.
**How to avoid:** Use provided `mockReactFlow()` utility in test setup, or use Playwright/Cypress for integration tests.
**Warning signs:** Test suite fails on React Flow components, mock-related errors.

### Pitfall 6: Connection Handles Not Visible
**What goes wrong:** Users can't create connections because handles aren't rendered.
**Why it happens:** Forgot to add `<Handle>` components to custom nodes.
**How to avoid:** Every custom node needs at least one Handle component. Source nodes need `type="source"`, target nodes need `type="target"`.
**Warning signs:** No connection points appear on nodes, drag doesn't initiate connection.

### Pitfall 7: Tree Expansion State Lost on Re-render
**What goes wrong:** Expanding a field tree collapses when React Flow re-renders nodes (dragging, connecting).
**Why it happens:** Tree expansion state stored in node data, which gets recreated on position changes.
**How to avoid:** Store expansion state separately from React Flow state (separate useState or Zustand store keyed by node ID).
**Warning signs:** Trees collapse unexpectedly during interaction, user frustration.

## Code Examples

Verified patterns from official sources:

### Basic React Flow Setup in Next.js
```typescript
// Source: https://reactflow.dev/learn/concepts/building-a-flow
'use client';

import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function MappingPage() {
  const initialNodes = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'Source Fields' } },
    { id: '2', position: { x: 500, y: 0 }, data: { label: 'Target Fields' } },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={initialNodes}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

### Custom Field Tree Node with Handles
```typescript
// Source: https://reactflow.dev/api-reference/components/handle
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface FieldData {
  name: string;
  type: string;
  children?: FieldData[];
  expanded?: boolean;
}

const FieldTreeNode = memo(({ data }: NodeProps<{ fields: FieldData[] }>) => {
  return (
    <div className="w-64 bg-white border rounded shadow-lg">
      <Handle type="target" position={Position.Left} />

      <div className="p-4">
        <h3 className="font-bold mb-2">Fields</h3>
        <ul className="space-y-1">
          {data.fields.map((field, idx) => (
            <li key={idx} className="text-sm">
              <span className="font-medium">{field.name}</span>
              <span className="text-gray-500 ml-2">{field.type}</span>
            </li>
          ))}
        </ul>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

FieldTreeNode.displayName = 'FieldTreeNode';
```

### Delete Edge with Backspace Key
```typescript
// Source: https://reactflow.dev/api-reference/react-flow
// Default behavior - backspace deletes selected edges/nodes
<ReactFlow
  nodes={nodes}
  edges={edges}
  deleteKeyCode="Backspace"  // This is the default
  onEdgesDelete={(deleted) => {
    // Clean up any metadata associated with deleted edges
    deleted.forEach(edge => {
      console.log('Cleaning up edge:', edge.id);
    });
  }}
/>

// To use Delete key instead:
<ReactFlow deleteKeyCode="Delete" />

// To disable keyboard deletion:
<ReactFlow deleteKeyCode={null} />
```

### Persistence with toObject()
```typescript
// Source: https://reactflow.dev/examples/interaction/save-and-restore
import { useReactFlow } from '@xyflow/react';

function SaveButton() {
  const { toObject } = useReactFlow();

  const handleSave = () => {
    const flow = toObject();
    localStorage.setItem('mapping-flow', JSON.stringify(flow));
  };

  return <button onClick={handleSave}>Save Mapping</button>;
}

function RestoreButton() {
  const { setNodes, setEdges, setViewport } = useReactFlow();

  const handleRestore = () => {
    const stored = localStorage.getItem('mapping-flow');
    if (stored) {
      const flow = JSON.parse(stored);
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      setViewport(flow.viewport || { x: 0, y: 0, zoom: 1 });
    }
  };

  return <button onClick={handleRestore}>Restore Mapping</button>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| reactflow package | @xyflow/react package | React Flow v12 (2024) | Update imports and package name |
| Default import | Named import | React Flow v12 | `import { ReactFlow }` not `import ReactFlow` |
| node.width/height for measured values | node.measured.width/height | React Flow v12 | Separates inline styles from computed dimensions |
| Mutating node objects | Spread syntax for updates | React Flow v12 | `{ ...node, hidden: true }` required |
| onEdgeUpdate | onReconnect | React Flow v12 | Renamed for clarity |
| react-window for virtualization | @tanstack/react-virtual | 2024 | TanStack Virtual more actively maintained, better DX |
| Jest as default test framework | Vitest for Vite projects | 2024-2025 | 10-20x faster test execution |

**Deprecated/outdated:**
- react-flow-renderer package (replaced by reactflow, then @xyflow/react)
- Version 11 branch (current maintained version is v12)
- Default export syntax (now uses named exports)
- Direct node mutation (now requires immutable updates)

## Open Questions

1. **Field Tree Virtualization Strategy**
   - What we know: @tanstack/react-virtual can virtualize long lists
   - What's unclear: How to implement virtualization inside custom React Flow nodes without breaking layout
   - Recommendation: Start without virtualization, add only if >100 fields causes performance issues. Test with realistic data sizes.

2. **Undo/Redo Implementation**
   - What we know: React Flow doesn't provide built-in undo/redo
   - What's unclear: Best pattern for undo/redo with React Flow state (separate history stack vs. Zustand middleware)
   - Recommendation: Defer to Phase 4 (Mapping Operations & UX). Consider zustand with temporal middleware or custom history stack.

3. **Multi-Select and Bulk Operations**
   - What we know: React Flow supports multi-select with Shift+Click
   - What's unclear: UI pattern for bulk mapping creation (select 3 source fields, map all to same target)
   - Recommendation: Start with 1:1 mappings (Phase 3 requirements). Defer bulk operations to Phase 4.

## Sources

### Primary (HIGH confidence)
- https://reactflow.dev - Official React Flow documentation (accessed 2026-02-11)
- https://reactflow.dev/learn/customization/custom-nodes - Custom node implementation patterns
- https://reactflow.dev/api-reference/hooks/use-nodes-state - State management hooks
- https://reactflow.dev/examples/interaction/validation - Connection validation examples
- https://reactflow.dev/examples/interaction/prevent-cycles - Cycle prevention implementation
- https://reactflow.dev/examples/interaction/save-and-restore - Persistence patterns
- https://reactflow.dev/learn/advanced-use/testing - Testing setup and mocking
- https://reactflow.dev/learn/troubleshooting/migrate-to-v12 - Version 12 migration guide
- https://www.npmjs.com/package/@xyflow/react - Official npm package page

### Secondary (MEDIUM confidence)
- https://nextjs.org/docs/app/getting-started/server-and-client-components - Next.js Server/Client Components
- https://tanstack.com/virtual/latest - TanStack Virtual documentation
- https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b - React Flow performance optimization guide

### Tertiary (LOW confidence)
- Community tree view libraries (shadcn-tree-view) - Need validation for production use
- Dagre/ELK.js layout algorithms - Optional, not required for Phase 3

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @xyflow/react is verified industry standard with official docs and npm stats
- Architecture: HIGH - All patterns verified from official React Flow documentation with working examples
- Pitfalls: HIGH - Common errors documented in official troubleshooting, confirmed by community discussions
- Next.js integration: MEDIUM - 'use client' requirement verified, but specific patterns from general Next.js docs
- Testing: MEDIUM - React Flow provides test utilities, but limited official testing examples

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - React Flow stable, Next.js 15 stable)

## Notes for Planner

This research focused on React Flow as the visualization layer. The planner should note:

1. **Phase 2 Integration:** Assumes Phase 2 delivers `FieldNode[]` structure. React Flow nodes will consume this data.

2. **Scope Boundaries:** Phase 3 delivers basic 1:1 mapping with expand/collapse. Advanced features (search, filter, undo/redo, transformations) are Phase 4+.

3. **Testing Strategy:** React Flow components require special test setup. Consider Playwright/Cypress for E2E tests vs. mocked Jest unit tests.

4. **Performance:** For schemas <100 fields, no optimization needed. If real-world usage shows larger schemas, revisit virtualization in Phase 4.

5. **State Management:** Start with `useNodesState`/`useEdgesState`. If state complexity grows (undo/redo, multi-mapping), consider Zustand migration.
