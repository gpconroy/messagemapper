'use client'

import { useState } from 'react'
import { SplitConfig, ConcatenateConfig } from '@/transformations/types'

interface StringOpFormProps {
  mode: 'split' | 'concatenate'
  config: Partial<SplitConfig | ConcatenateConfig>
  onChange: (config: Partial<SplitConfig | ConcatenateConfig>) => void
}

/**
 * Configuration form for split and concatenate transformations
 */
export function StringOpForm({ mode, config, onChange }: StringOpFormProps) {
  const [currentMode, setCurrentMode] = useState<'split' | 'concatenate'>(mode)

  const handleModeChange = (newMode: 'split' | 'concatenate') => {
    setCurrentMode(newMode)
    // Reset config when mode changes
    if (newMode === 'split') {
      onChange({ delimiter: '', isRegex: false, trim: false })
    } else {
      onChange({ separator: '', trim: false })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="string-mode"
              value="split"
              checked={currentMode === 'split'}
              onChange={() => handleModeChange('split')}
              className="mr-2 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Split</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="string-mode"
              value="concatenate"
              checked={currentMode === 'concatenate'}
              onChange={() => handleModeChange('concatenate')}
              className="mr-2 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Concatenate</span>
          </label>
        </div>
      </div>

      {currentMode === 'split' ? (
        <>
          <div>
            <label htmlFor="delimiter" className="block text-sm font-medium text-gray-700 mb-1">
              Delimiter <span className="text-red-500">*</span>
            </label>
            <input
              id="delimiter"
              type="text"
              value={(config as SplitConfig).delimiter || ''}
              onChange={(e) => onChange({ ...config, delimiter: e.target.value })}
              placeholder=","
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Character(s) to split on</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={(config as SplitConfig).isRegex || false}
                onChange={(e) => onChange({ ...config, isRegex: e.target.checked })}
                className="mr-2 text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <span className="text-sm text-gray-700">Use Regular Expression</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={(config as SplitConfig).trim || false}
                onChange={(e) => onChange({ ...config, trim: e.target.checked })}
                className="mr-2 text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <span className="text-sm text-gray-700">Trim Whitespace</span>
            </label>
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="separator" className="block text-sm font-medium text-gray-700 mb-1">
              Separator <span className="text-red-500">*</span>
            </label>
            <input
              id="separator"
              type="text"
              value={(config as ConcatenateConfig).separator || ''}
              onChange={(e) => onChange({ ...config, separator: e.target.value })}
              placeholder=" "
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Character(s) to join with</p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={(config as ConcatenateConfig).trim || false}
                onChange={(e) => onChange({ ...config, trim: e.target.checked })}
                className="mr-2 text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <span className="text-sm text-gray-700">Trim Whitespace</span>
            </label>
          </div>
        </>
      )}
    </div>
  )
}
