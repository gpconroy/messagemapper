'use client'

import { TransformationType } from '@/transformations/types'

interface TransformationBadgeProps {
  type: TransformationType
  onClick?: () => void
}

/**
 * Visual badge indicating transformation type on mapping edge
 */
export function TransformationBadge({ type, onClick }: TransformationBadgeProps) {
  const getAbbreviation = (transformType: TransformationType): string => {
    switch (transformType) {
      case 'format_date':
        return 'Dt'
      case 'format_number':
        return '#'
      case 'split':
        return 'Split'
      case 'concatenate':
        return 'Join'
      case 'conditional':
        return 'If'
      case 'constant':
        return '='
      case 'lookup':
        return 'Lkp'
      case 'custom_js':
        return 'JS'
      default:
        return '?'
    }
  }

  return (
    <span
      className="bg-indigo-100 text-indigo-800 text-xs px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-indigo-200 transition-colors"
      onClick={onClick}
      title={`Transformation: ${type}`}
    >
      {getAbbreviation(type)}
    </span>
  )
}
