'use client'

import { NumberFormatConfig } from '@/transformations/types'

interface NumberFormatFormProps {
  config: Partial<NumberFormatConfig>
  onChange: (config: Partial<NumberFormatConfig>) => void
}

/**
 * Configuration form for number format transformation
 */
export function NumberFormatForm({ config, onChange }: NumberFormatFormProps) {
  const isCurrency = config.type === 'currency'

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="format-type" className="block text-sm font-medium text-gray-700 mb-1">
          Format Type <span className="text-red-500">*</span>
        </label>
        <select
          id="format-type"
          value={config.type || 'number'}
          onChange={(e) => onChange({ ...config, type: e.target.value as 'number' | 'currency' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="number">Number</option>
          <option value="currency">Currency</option>
        </select>
      </div>

      {isCurrency && (
        <>
          <div>
            <label htmlFor="currency-code" className="block text-sm font-medium text-gray-700 mb-1">
              Currency Code <span className="text-red-500">*</span>
            </label>
            <input
              id="currency-code"
              type="text"
              value={config.currency || ''}
              onChange={(e) => onChange({ ...config, currency: e.target.value })}
              placeholder="USD"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Examples: USD, EUR, GBP, JPY</p>
          </div>

          <div>
            <label htmlFor="locale" className="block text-sm font-medium text-gray-700 mb-1">
              Locale
            </label>
            <input
              id="locale"
              type="text"
              value={config.locale || ''}
              onChange={(e) => onChange({ ...config, locale: e.target.value || undefined })}
              placeholder="en-US"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Examples: en-US, de-DE, fr-FR, ja-JP</p>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="min-fraction" className="block text-sm font-medium text-gray-700 mb-1">
            Min Fraction Digits
          </label>
          <input
            id="min-fraction"
            type="number"
            min="0"
            max="20"
            value={config.minimumFractionDigits ?? ''}
            onChange={(e) => onChange({
              ...config,
              minimumFractionDigits: e.target.value ? parseInt(e.target.value) : undefined
            })}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="max-fraction" className="block text-sm font-medium text-gray-700 mb-1">
            Max Fraction Digits
          </label>
          <input
            id="max-fraction"
            type="number"
            min="0"
            max="20"
            value={config.maximumFractionDigits ?? ''}
            onChange={(e) => onChange({
              ...config,
              maximumFractionDigits: e.target.value ? parseInt(e.target.value) : undefined
            })}
            placeholder="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  )
}
