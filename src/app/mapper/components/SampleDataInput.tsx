'use client'

import React, { useState } from 'react'

interface SampleDataInputProps {
  onFileLoaded: (values: Record<string, unknown>, fileName: string) => void
  isLoading?: boolean
}

/**
 * File upload component for entering sample data.
 * Accepts JSON and XML files, parses them via API, and returns flat path-value map.
 */
export function SampleDataInput({ onFileLoaded, isLoading = false }: SampleDataInputProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setIsUploading(true)

    try {
      // Create FormData and upload file
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-sample-data', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setFileName(result.fileName)
        onFileLoaded(result.values, result.fileName)
      } else {
        throw new Error(result.error || 'Failed to parse file')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload file'
      setUploadError(errorMessage)
      console.error('File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    setFileName(null)
    setUploadError(null)
    // Reset file input
    const input = document.getElementById('sample-file-input') as HTMLInputElement
    if (input) {
      input.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="sample-file-input" className="block text-sm font-medium text-gray-700">
        Sample Data File
      </label>

      {/* File Upload Area */}
      {!fileName ? (
        <div className="relative">
          <input
            id="sample-file-input"
            type="file"
            accept=".json,.xml"
            onChange={handleFileSelect}
            disabled={isLoading || isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Upload sample data file"
          />
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isUploading
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {isUploading ? (
              <div className="text-sm text-gray-600">
                <div className="animate-pulse">Parsing file...</div>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">JSON or XML files (max 5MB)</p>
              </>
            )}
          </div>
        </div>
      ) : (
        /* File Loaded Success State */
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-green-600" aria-label="Success">
              ✓
            </span>
            <span className="text-sm font-medium text-gray-800">{fileName}</span>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
            aria-label="Clear file and upload another"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}
    </div>
  )
}
