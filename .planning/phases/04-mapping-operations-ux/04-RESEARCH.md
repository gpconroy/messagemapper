# Phase 4: Mapping Operations & UX - Research

**Researched:** 2026-02-11
**Domain:** Interactive canvas UX, state management, tree virtualization
**Confidence:** HIGH

## Summary

Phase 4 enhances the visual mapping interface (Phase 3) with essential operations for handling large schemas: search/filter, visual indicators for field metadata, undo/redo, and zoom/pan controls. The research reveals that React Flow already provides robust zoom/pan capabilities built-in, making custom implementation unnecessary. For undo/redo, Zustand with Zundo middleware offers lightweight (<700 bytes) time-travel functionality perfectly suited to mapping state. Tree search/filter requires virtualized rendering for performance with hundreds of fields, where react-arborist excels with built-in filtering and virtualization. The key insight is that all core functionality should leverage existing solutions rather than custom implementations, as each domain has non-obvious complexity (undo state memory management, virtualization scroll position, debounced search UX).

**Primary recommendation:** Use React Flow's built-in Controls and viewport API for zoom/pan, Zundo middleware for undo/redo state management, react-arborist for tree filtering with virtualization, and react-resizable-panels for split panel layout. Avoid custom state management, manual DOM virtualization, and hand-rolled debouncing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12+ | Zoom/pan canvas control | Built-in viewport management, Controls component, performance-optimized for hundreds of nodes |
| zundo | 2+ | Undo/redo middleware | <700 bytes, integrates seamlessly with Zustand, manages past/future state automatically |
| react-arborist | 3.4+ | Tree view with search/filter | Built-in virtualization, search matching, expand/collapse, handles 10,000+ nodes smoothly |
| react-resizable-panels | 2+ | Resizable split panels | Accessible (WAI-ARIA), keyboard navigation, layout persistence, smooth interactions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons | 5+ | Field type icons | 40,000+ icons from 20+ sets including Material Design, tree-shakeable |
| zustand | 4.2+ | State management | Already used in project, required for Zundo middleware |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-arborist | MUI Tree View | MUI heavier bundle, but provides more comprehensive component ecosystem |
| Zundo | use-undo hook | use-undo is standalone but requires manual integration vs Zundo's seamless Zustand middleware |
| react-resizable-panels | react-split-pane | react-split-pane older, less accessible, lacks modern features like layout persistence |

**Installation:**
```bash
npm install @xyflow/react zundo react-arborist react-resizable-panels react-icons zustand
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── mapping/
│   │   ├── MapCanvas.tsx          # React Flow canvas wrapper
│   │   ├── FieldTree.tsx          # react-arborist tree component
│   │   ├── SearchInput.tsx        # Debounced search with ARIA labels
│   │   └── FieldNode.tsx          # Custom node with type icons + badges
│   └── layout/
│       └── ResizableLayout.tsx    # react-resizable-panels wrapper
├── hooks/
│   ├── useMapStore.ts             # Zustand store with Zundo temporal middleware
│   └── useDebounce.ts             # Custom debounce hook (300-500ms)
└── types/
    └── mapping.ts                 # TypeScript types for field metadata
```

### Pattern 1: Undo/Redo State Management with Zundo

**What:** Wrap Zustand store with temporal middleware to enable automatic undo/redo tracking
**When to use:** For all mapping operations (create, delete, move connections)
**Example:**
```typescript
// Source: https://github.com/charkour/zundo
import { create } from 'zustand';
import { temporal } from 'zundo';

interface MappingState {
  connections: Connection[];
  addConnection: (conn: Connection) => void;
  removeConnection: (id: string) => void;
}

const useMapStore = create<MappingState>()(
  temporal(
    (set) => ({
      connections: [],
      addConnection: (conn) => set((state) => ({
        connections: [...state.connections, conn]
      })),
      removeConnection: (id) => set((state) => ({
        connections: state.connections.filter(c => c.id !== id)
      })),
    }),
    {
      limit: 50, // Prevent memory bloat with history cap
      partialize: (state) => ({
        // Only track connections in history, not UI state
        connections: state.connections,
      }),
    }
  )
);

// Access undo/redo in components
const { undo, redo } = useMapStore.temporal.getState();
```

### Pattern 2: React Flow Built-in Zoom/Pan Controls

**What:** Use React Flow's Controls component and viewport API instead of custom implementation
**When to use:** All canvas zoom/pan requirements
**Example:**
```typescript
// Source: https://reactflow.dev/api-reference/components/controls
import { ReactFlow, Controls, useReactFlow } from '@xyflow/react';

function MapCanvas() {
  const { setViewport, fitView } = useReactFlow();

  return (
    <ReactFlow nodes={nodes} edges={edges}>
      <Controls
        showZoom={true}
        showFitView={true}
        showInteractive={true}
        position="bottom-left"
      />
    </ReactFlow>
  );
}

// Programmatic zoom/pan
function handleFitToContent() {
  fitView({ padding: 0.2, duration: 800 });
}
```

### Pattern 3: Virtualized Tree Search with react-arborist

**What:** Tree component with built-in filtering and virtualization for large field lists
**When to use:** Source/target field panels with 100+ fields
**Example:**
```typescript
// Source: https://github.com/brimdata/react-arborist
import { Tree } from 'react-arborist';

function FieldTree({ data, searchTerm }: Props) {
  return (
    <Tree
      data={data}
      searchTerm={searchTerm}
      searchMatch={(node, term) =>
        node.data.name.toLowerCase().includes(term.toLowerCase())
      }
      openByDefault={false}
      width="100%"
      height={600}
      rowHeight={32}
      indent={24}
    >
      {({ node, style, dragHandle }) => (
        <div style={style} ref={dragHandle}>
          <FieldNode node={node} />
        </div>
      )}
    </Tree>
  );
}
```

### Pattern 4: Debounced Search Input

**What:** Input with 300-500ms debounce to reduce re-renders during typing
**When to use:** All search/filter inputs
**Example:**
```typescript
// Source: Multiple sources on debounce best practices
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function SearchInput({ onChange }: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    onChange(debouncedSearch);
  }, [debouncedSearch, onChange]);

  return (
    <input
      type="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      aria-label="Search fields"
      placeholder="Filter fields..."
    />
  );
}
```

### Pattern 5: Custom Field Node with Visual Indicators

**What:** React Flow custom node showing type icon, required badge, and metadata
**When to use:** All field representations in mapping canvas
**Example:**
```typescript
// Source: https://reactflow.dev/learn/customization/custom-nodes
import { Handle, Position } from '@xyflow/react';
import { MdTextFields, MdNumbers, MdCalendarToday, MdCheckBox } from 'react-icons/md';

const typeIcons = {
  string: MdTextFields,
  number: MdNumbers,
  date: MdCalendarToday,
  boolean: MdCheckBox,
};

function FieldNode({ data }: NodeProps<FieldData>) {
  const Icon = typeIcons[data.type];

  return (
    <div className="field-node">
      <Handle type="target" position={Position.Left} />

      <div className="field-content">
        <Icon className="type-icon" />
        <span className="field-name">{data.name}</span>
        {data.required && (
          <span className="badge-required" aria-label="Required field">*</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// Register custom node type
const nodeTypes = { fieldNode: React.memo(FieldNode) };
```

### Anti-Patterns to Avoid

- **Storing entire node array in components:** Direct access to `nodes` from React Flow store causes re-renders on every node position change. Instead, store derived state (selected IDs, filtered results) separately.
- **Non-memoized custom nodes:** Always wrap with `React.memo()` or declare outside parent component to prevent re-instantiation on every render.
- **Unlimited undo history:** Without `limit` option, undo history grows unbounded, causing memory leaks. Set reasonable limit (50-100 actions).
- **Synchronous search filtering:** Filtering large trees on every keystroke freezes UI. Always debounce search input (300-500ms).
- **Missing virtualization:** Rendering 500+ DOM nodes without virtualization causes scroll jank. Use virtualized tree components for any list over 100 items.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zoom/pan canvas controls | Custom viewport state, mouse drag handlers, wheel zoom logic | React Flow Controls component + viewport API | Handles touch gestures, keyboard shortcuts, smooth animations, edge cases (min/max zoom, boundary constraints) |
| Undo/redo state | Manual past/future arrays, custom action tracking | Zundo temporal middleware | Manages memory limits, state snapshots, partialize filtering, equality checking automatically |
| Tree virtualization | Custom virtual scroll, height calculations, visible range logic | react-arborist with built-in virtualization | Calculates row positions, scroll offsets, resize observers, dynamic height support |
| Search debouncing | setTimeout/clearTimeout in components | useDebounce hook or lodash.debounce with useCallback | Cleanup handling, multiple search inputs, consistent delay across app |
| Resizable panels | Manual mouse drag, resize calculations, min/max constraints | react-resizable-panels | Accessibility (keyboard resize, ARIA attributes), layout persistence, touch support |

**Key insight:** Every UI interaction pattern has 5-10 edge cases you discover only in production. Search has: mobile keyboard timing, paste events, clear button, Enter key submit. Undo has: memory limits, collaborative conflicts, undo-after-navigation. Zoom has: pinch gestures, keyboard shortcuts, fit-to-screen, min/max bounds. Libraries solve these once; custom code rediscovers them slowly.

## Common Pitfalls

### Pitfall 1: Undo/Redo Memory Bloat
**What goes wrong:** Storing full state snapshots without limits causes memory to grow unbounded, eventually degrading performance or crashing on large schemas
**Why it happens:** Default Zundo config has no history limit; every state change adds to past/future arrays
**How to avoid:** Set explicit `limit` (50-100) and use `partialize` to exclude UI-only state from history
**Warning signs:** Browser memory usage climbing over time, slow undo operations after many actions, "out of memory" errors

### Pitfall 2: React Flow Node Re-render Cascade
**What goes wrong:** Components re-render on every node position change during drag operations, causing lag and dropped frames
**Why it happens:** Accessing `nodes` array from store in components subscribes to all node updates
**How to avoid:** Store filtered/selected node IDs separately, use `React.memo()` on custom nodes, memoize objects/arrays passed as props
**Warning signs:** Choppy drag performance, console warnings about expensive re-renders, CPU spikes during pan/zoom

### Pitfall 3: Search Input Without Debounce
**What goes wrong:** Tree filters on every keystroke, causing janky typing experience and excessive re-renders
**Why it happens:** onChange handler directly updates search state used for filtering
**How to avoid:** Use useDebounce hook with 300-500ms delay before applying filter
**Warning signs:** Visible input lag when typing, slow autocomplete, users reporting "laggy search"

### Pitfall 4: Missing Virtualization on Large Trees
**What goes wrong:** Rendering 500+ field nodes in DOM causes scroll jank, slow expand/collapse, and memory pressure
**Why it happens:** Standard React tree components render all nodes regardless of visibility
**How to avoid:** Use react-arborist or similar virtualized tree component that only renders visible rows
**Warning signs:** Scroll stuttering, slow initial render, browser DevTools showing thousands of DOM nodes

### Pitfall 5: Inaccessible Keyboard Controls
**What goes wrong:** Undo/redo only works via buttons, zoom only via mouse, panels can't be resized with keyboard
**Why it happens:** Custom implementations often skip keyboard accessibility
**How to avoid:** Use libraries with built-in ARIA support (react-resizable-panels), implement standard shortcuts (Ctrl+Z, Ctrl+Shift+Z), test with keyboard-only navigation
**Warning signs:** Screen reader users unable to navigate, accessibility audit failures, keyboard users unable to access features

### Pitfall 6: Type Icon Scaling Issues
**What goes wrong:** Icons inconsistent size, misaligned with text, or blurry at different zoom levels
**Why it happens:** Mixing pixel sizing with font-based components, missing viewBox on SVG icons
**How to avoid:** Use react-icons (consistent SVG rendering), set fixed icon size in rem units, test at different zoom levels
**Warning signs:** Icons clipped or cut off, misalignment between icon and label, blurry icons

## Code Examples

Verified patterns from official sources:

### React Flow Performance Optimization
```typescript
// Source: https://reactflow.dev/learn/advanced-use/performance
import React, { memo, useCallback, useMemo } from 'react';
import { ReactFlow, Node, Edge } from '@xyflow/react';

// ✓ Memoize node types object
const nodeTypes = { fieldNode: FieldNode };

// ✓ Memoize edge options
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
};

function MapCanvas() {
  // ✓ Store only IDs, not full nodes array
  const selectedIds = useStore((state) => state.selectedFieldIds);

  // ✓ Memoize callbacks
  const onNodesChange = useCallback((changes) => {
    // Handle changes
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onNodesChange={onNodesChange}
    />
  );
}
```

### Keyboard Shortcuts for Undo/Redo
```typescript
// Source: Best practices for keyboard accessibility in React
import { useEffect } from 'react';

function useUndoRedoShortcuts() {
  const { undo, redo } = useMapStore.temporal.getState();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
```

### Accessible Search Input with ARIA
```typescript
// Source: https://react-spectrum.adobe.com/react-aria/accessibility.html
function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="search-container">
      <label htmlFor="field-search" className="sr-only">
        Search fields
      </label>
      <input
        id="field-search"
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label="Search and filter fields by name"
        aria-describedby="search-hint"
      />
      <span id="search-hint" className="sr-only">
        Type to filter visible fields
      </span>
    </div>
  );
}
```

### Resizable Panel Layout
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

function MappingLayout() {
  return (
    <PanelGroup orientation="horizontal">
      <Panel defaultSize={40} minSize={20}>
        <FieldTree
          title="Source Fields"
          data={sourceFields}
          searchTerm={sourceSearch}
        />
      </Panel>

      <PanelResizeHandle />

      <Panel defaultSize={60} minSize={30}>
        <MapCanvas />
      </Panel>
    </PanelGroup>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom undo with useState + arrays | Zundo temporal middleware | 2023 | Eliminates manual history management, reduces bugs |
| react-virtualized library | react-arborist / TanStack Virtual | 2024-2025 | react-virtualized deprecated, modern alternatives more performant |
| lodash.debounce imported globally | useDebounce custom hook | 2024 | Tree-shakeable, better TypeScript support, avoids global lodash |
| React Flow v10 | React Flow v12 (@xyflow/react) | 2024 | Package rename, improved performance, better TypeScript types |
| Manual resize handlers | react-resizable-panels | 2023-2024 | Built-in accessibility, keyboard support, layout persistence |

**Deprecated/outdated:**
- **react-virtualized**: Officially deprecated, use TanStack Virtual or react-arborist for tree views
- **use-undo hook**: Still works but Zundo provides better Zustand integration and smaller bundle
- **React Flow v10 package name**: Now published as @xyflow/react (v11+)

## Open Questions

1. **React Flow Custom Node Drag Performance with Hundreds of Nodes**
   - What we know: React Flow handles 100-1000 nodes well with proper memoization
   - What's unclear: Optimal node complexity limit (icons, badges, nested elements) before drag performance degrades
   - Recommendation: Start simple, add visual complexity progressively, test drag performance at 200+ nodes

2. **Undo/Redo Granularity for Batch Operations**
   - What we know: Each state change creates history entry
   - What's unclear: Should bulk mapping operations (e.g., auto-map 50 fields) be single undo action or 50 individual actions
   - Recommendation: Implement `pause()` and `resume()` from Zundo temporal API to batch multiple changes into single history entry

3. **Tree Search Highlighting vs Filter-Only**
   - What we know: react-arborist supports filtering (show/hide nodes)
   - What's unclear: Whether to also highlight matching text within visible nodes
   - Recommendation: Start with filter-only for Phase 4, add highlighting in later phase if user testing shows need

## Sources

### Primary (HIGH confidence)
- React Flow Official Docs - https://reactflow.dev/learn/concepts/the-viewport - Zoom/pan viewport concepts
- React Flow Performance Guide - https://reactflow.dev/learn/advanced-use/performance - Optimization techniques verified
- React Flow Custom Nodes - https://reactflow.dev/learn/customization/custom-nodes - Node implementation patterns
- React Flow Controls API - https://reactflow.dev/api-reference/components/controls - Controls component reference
- Zundo GitHub - https://github.com/charkour/zundo - Installation, API, Zustand integration
- react-arborist GitHub - https://github.com/brimdata/react-arborist - Tree component API and search/filter
- react-resizable-panels GitHub - https://github.com/bvaughn/react-resizable-panels - Accessibility, layout persistence

### Secondary (MEDIUM confidence)
- React Flow Performance Optimization Guide - https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b - Community best practices (verified against official docs)
- React Icon Libraries 2026 - https://lineicons.com/blog/react-icon-libraries - react-icons ecosystem overview
- Debounce Best Practices - https://medium.com/@limaniratnayake/debounce-your-search-and-optimize-your-react-input-component-49a4e62e7e8f - Search input optimization patterns
- React Accessibility - https://react-spectrum.adobe.com/react-aria/accessibility.html - ARIA implementation patterns
- Undo/Redo State Management - https://github.com/xplato/useUndoable - Alternative approaches comparison

### Tertiary (LOW confidence)
- React Tree Components Overview - https://reactscript.com/best-tree-view/ - Ecosystem survey (2026 update)
- State Management Trends 2026 - https://trio.dev/7-top-react-state-management-libraries/ - General state management landscape

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified from official docs/GitHub, version numbers confirmed, integration patterns tested in community
- Architecture: HIGH - Patterns sourced from official documentation, React Flow examples, Zundo README, common React patterns
- Pitfalls: MEDIUM-HIGH - Based on official performance docs (HIGH) and community experience reports (MEDIUM), cross-verified across sources

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable ecosystem, React Flow and Zustand both mature libraries with infrequent breaking changes)
