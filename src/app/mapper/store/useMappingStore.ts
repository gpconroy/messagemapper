'use client'

import { create } from 'zustand'
import { temporal } from 'zundo'
import { FieldNode } from '@/types/parser-types'
import { createMappingEdgeId } from '../lib/validation'

interface MappingStoreState {
  // Core state (tracked by undo/redo)
  connections: Array<{
    id: string
    sourceFieldPath: string
    targetFieldPath: string
  }>

  // Schema state (NOT tracked by undo/redo)
  sourceSchema: { fields: FieldNode[]; label: string } | null
  targetSchema: { fields: FieldNode[]; label: string } | null

  // Actions
  addConnection: (sourceFieldPath: string, targetFieldPath: string) => void
  removeConnection: (id: string) => void
  removeConnections: (ids: string[]) => void
  setSourceSchema: (fields: FieldNode[], label: string) => void
  setTargetSchema: (fields: FieldNode[], label: string) => void
}

export const useMappingStore = create<MappingStoreState>()(
  temporal(
    (set) => ({
      connections: [],
      sourceSchema: null,
      targetSchema: null,

      addConnection: (sourceFieldPath, targetFieldPath) =>
        set((state) => ({
          connections: [
            ...state.connections,
            {
              id: createMappingEdgeId(sourceFieldPath, targetFieldPath),
              sourceFieldPath,
              targetFieldPath,
            },
          ],
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
        })),

      removeConnections: (ids) =>
        set((state) => ({
          connections: state.connections.filter((c) => !ids.includes(c.id)),
        })),

      setSourceSchema: (fields, label) =>
        set({ sourceSchema: { fields, label } }),

      setTargetSchema: (fields, label) =>
        set({ targetSchema: { fields, label } }),
    }),
    {
      limit: 50,
      partialize: (state) => ({
        connections: state.connections,
      }),
    }
  )
)
