import { FieldNode } from '@/types/parser-types'

/** Which side of the mapping canvas */
export type MappingSide = 'source' | 'target'

/** Data payload for React Flow custom field tree nodes */
export interface MappingNodeData extends Record<string, unknown> {
  side: MappingSide
  label: string
  fields: FieldNode[]
  expanded: Record<string, boolean>
}

/** Metadata stored on edges connecting two fields */
export interface MappingEdgeData extends Record<string, unknown> {
  sourceFieldPath: string
  targetFieldPath: string
}

/** Field mapping status for visual indication */
export type FieldMappingStatus = 'mapped' | 'unmapped' | 'partial'
