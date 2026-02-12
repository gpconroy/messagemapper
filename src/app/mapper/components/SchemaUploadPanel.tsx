'use client'

import { useState } from 'react'
import { MappingSide } from '@/types/mapping-types'
import { FieldNode, ParserResult } from '@/types/parser-types'

interface SchemaUploadPanelProps {
  side: MappingSide
  onSchemaLoaded: (fields: FieldNode[], fileName: string, formatType?: string) => void
}

export function SchemaUploadPanel({ side, onSchemaLoaded }: SchemaUploadPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedFile, setLoadedFile] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-schema', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse schema')
      }

      const result: ParserResult = await response.json()

      if (!result.success) {
        throw new Error(result.errors.join(', '))
      }

      onSchemaLoaded(result.fieldNodes, file.name, result.parserType)
      setLoadedFile(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">
        {side === 'source' ? 'Source Schema' : 'Target Schema'}
      </h3>

      <div className="relative">
        <label
          htmlFor={`file-input-${side}`}
          className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="text-center">
            {loading ? (
              <div className="text-blue-600 font-medium">Parsing...</div>
            ) : loadedFile ? (
              <>
                <div className="text-green-600 font-medium mb-1">Loaded</div>
                <div className="text-sm text-gray-600">{loadedFile}</div>
              </>
            ) : (
              <>
                <div className="text-gray-600 font-medium mb-1">Upload Schema</div>
                <div className="text-xs text-gray-500">JSON, XML, or XSD</div>
              </>
            )}
          </div>
        </label>
        <input
          id={`file-input-${side}`}
          type="file"
          accept=".json,.xml,.xsd"
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  )
}
