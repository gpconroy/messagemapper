'use client'

import { create } from 'zustand'
import { temporal } from 'zundo'
import { FieldNode } from '@/types/parser-types'
import { ConnectionTransformation } from '@/types/mapping-types'
import { createMappingEdgeId } from '../lib/validation'

interface MappingStoreState {
  // Core state (tracked by undo/redo)
  connections: Array<{
    id: string
    sourceFieldPath: string
    targetFieldPath: string
    transformation?: ConnectionTransformation
  }>

  // UI state (NOT tracked by undo/redo)
  selectedConnectionId: string | null

  // Schema state (NOT tracked by undo/redo)
  sourceSchema: { fields: FieldNode[]; label: string } | null
  targetSchema: { fields: FieldNode[]; label: string } | null

  // Actions
  addConnection: (sourceFieldPath: string, targetFieldPath: string) => void
  removeConnection: (id: string) => void
  removeConnections: (ids: string[]) => void
  setConnectionTransform: (connectionId: string, transformation: ConnectionTransformation) => void
  removeConnectionTransform: (connectionId: string) => void
  getConnectionTransform: (connectionId: string) => ConnectionTransformation | undefined
  setSelectedConnectionId: (id: string | null) => void
  setSourceSchema: (fields: FieldNode[], label: string) => void
  setTargetSchema: (fields: FieldNode[], label: string) => void
}

export const useMappingStore = create<MappingStoreState>()(
  temporal(
    (set, get) => ({
      connections: [],
      selectedConnectionId: null,
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

      setConnectionTransform: (connectionId, transformation) =>
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === connectionId ? { ...c, transformation } : c
          ),
        })),

      removeConnectionTransform: (connectionId) =>
        set((state) => ({
          connections: state.connections.map((c) => {
            if (c.id === connectionId) {
              const { transformation, ...rest } = c
              return rest
            }
            return c
          }),
        })),

      getConnectionTransform: (connectionId) => {
        const connection = get().connections.find((c) => c.id === connectionId)
        return connection?.transformation
      },

      setSelectedConnectionId: (id) =>
        set({ selectedConnectionId: id }),

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
