'use client'

import { useCallback } from 'react'
import { FieldNode } from '@/types/parser-types'
import { useMappingStore } from '../store/useMappingStore'

interface UseFieldTreeReturn {
  expandedPaths: Record<string, boolean>
  toggleExpand: (path: string) => void
  expandAll: (fields: FieldNode[]) => void
  collapseAll: () => void
  isExpanded: (path: string) => boolean
}

/**
 * Manages field tree expansion state independently from React Flow node state.
 *
 * CRITICAL: This state is intentionally SEPARATE from React Flow node state.
 * React Flow re-renders nodes on every position/edge change. If expansion state
 * lives in node data, trees collapse unexpectedly (Pitfall 7 from research).
 *
 * Each node (source/target) has independent expansion state via nodeId scope.
 */
export function useFieldTree(nodeId: string): UseFieldTreeReturn {
  const expandedPaths = useMappingStore((state) => state.fieldTreeExpanded[nodeId] ?? {})
  const setFieldTreeExpanded = useMappingStore((state) => state.setFieldTreeExpanded)

  const toggleExpand = useCallback((path: string) => {
    setFieldTreeExpanded(nodeId, {
      ...expandedPaths,
      [path]: !expandedPaths[path],
    })
  }, [expandedPaths, nodeId, setFieldTreeExpanded])

  const expandAll = useCallback((fields: FieldNode[]) => {
    const allPaths: Record<string, boolean> = {}

    const collectPaths = (nodes: FieldNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allPaths[node.path] = true
          collectPaths(node.children)
        }
      }
    }

    collectPaths(fields)
    setFieldTreeExpanded(nodeId, allPaths)
  }, [nodeId, setFieldTreeExpanded])

  const collapseAll = useCallback(() => {
    setFieldTreeExpanded(nodeId, {})
  }, [nodeId, setFieldTreeExpanded])

  const isExpanded = useCallback(
    (path: string) => {
      return expandedPaths[path] ?? false
    },
    [expandedPaths]
  )

  return {
    expandedPaths,
    toggleExpand,
    expandAll,
    collapseAll,
    isExpanded,
  }
}
