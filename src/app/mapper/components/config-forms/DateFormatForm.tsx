'use client'

import { DateFormatConfig } from '@/transformations/types'

interface DateFormatFormProps {
  config: Partial<DateFormatConfig>
  onChange: (config: Partial<DateFormatConfig>) => void
}

/**
 * Configuration form for date format transformation
 */
export function DateFormatForm({ config, onChange }: DateFormatFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="from-format" className="block text-sm font-medium text-gray-700 mb-1">
          Source Format (optional)
        </label>
        <input
          id="from-format"
          type="text"
          value={config.from || ''}
          onChange={(e) => onChange({ ...config, from: e.target.value || undefined })}
          placeholder="yyyyMMdd"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave blank for auto-detect. Examples: yyyy-MM-dd, MM/dd/yyyy, yyyyMMdd
        </p>
      </div>

      <div>
        <label htmlFor="to-format" className="block text-sm font-medium text-gray-700 mb-1">
          Target Format <span className="text-red-500">*</span>
        </label>
        <input
          id="to-format"
          type="text"
          value={config.to || ''}
          onChange={(e) => onChange({ ...config, to: e.target.value })}
          placeholder="MM/dd/yyyy"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Examples: MM/dd/yyyy, yyyy-MM-dd, dd.MM.yyyy, ISO 8601
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-xs text-blue-800 font-medium mb-1">Format Tokens:</p>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li><code>yyyy</code> - 4-digit year</li>
          <li><code>MM</code> - 2-digit month</li>
          <li><code>dd</code> - 2-digit day</li>
          <li><code>HH:mm:ss</code> - Time (24-hour)</li>
        </ul>
      </div>
    </div>
  )
}
