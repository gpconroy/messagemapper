'use client'

import React from 'react'
import { MappingSide } from '@/types/mapping-types'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  side: MappingSide
}

/**
 * Search input component for filtering fields by name.
 * Styled with side-appropriate accent colors (blue for source, green for target).
 */
export function SearchInput({ value, onChange, placeholder = 'Search fields...', side }: SearchInputProps) {
  const accentColor = side === 'source'
    ? 'focus:border-blue-500 focus:ring-blue-500'
    : 'focus:border-green-500 focus:ring-green-500'

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Search and filter fields by name"
      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${accentColor}`}
    />
  )
}
