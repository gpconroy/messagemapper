'use client'

import { useState } from 'react'

interface CustomJSFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

/**
 * Configuration form for custom JavaScript transformations
 */
export function CustomJSForm({ config, onChange }: CustomJSFormProps) {
  const code = (config.code as string) || ''
  const timeout = (config.timeout as number) || 5000

  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; output?: unknown; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const handleCodeChange = (newCode: string) => {
    onChange({ ...config, code: newCode })
  }

  const handleTimeoutChange = (newTimeout: number) => {
    onChange({ ...config, timeout: newTimeout })
  }

  const insertTemplate = () => {
    const template = '// input contains the source field value\nreturn input;'
    handleCodeChange(template)
  }

  const handleTest = async () => {
    if (!code.trim()) {
      setTestResult({ success: false, error: 'Code is required' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/transformations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: testInput || 'test',
          rule: {
            type: 'custom_js',
            config: { code, timeout },
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Test failed')
      }

      const data = await response.json()
      setTestResult({ success: true, output: data.output })
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Test execution failed',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          Write JavaScript code that transforms the <code className="bg-blue-100 px-1 rounded">input</code> variable and returns the result.
        </p>
      </div>

      {/* Code Editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="custom-js-code" className="block text-sm font-medium text-gray-700">
            JavaScript Code <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={insertTemplate}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Insert Template
          </button>
        </div>
        <textarea
          id="custom-js-code"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="// Example:\nreturn input.toUpperCase();"
          rows={8}
          className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-green-400"
          onKeyDown={(e) => {
            // Handle Tab key to insert spaces instead of losing focus
            if (e.key === 'Tab') {
              e.preventDefault()
              const target = e.target as HTMLTextAreaElement
              const start = target.selectionStart
              const end = target.selectionEnd
              const newValue = code.substring(0, start) + '  ' + code.substring(end)
              handleCodeChange(newValue)
              // Set cursor position after inserted spaces
              setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 2
              }, 0)
            }
          }}
        />
      </div>

      {/* Timeout Configuration */}
      <div>
        <label htmlFor="custom-js-timeout" className="block text-sm font-medium text-gray-700 mb-1">
          Timeout (ms)
        </label>
        <input
          id="custom-js-timeout"
          type="number"
          value={timeout}
          onChange={(e) => handleTimeoutChange(Number(e.target.value))}
          min={100}
          max={30000}
          step={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum execution time. Default: 5000ms (5 seconds). Max: 30000ms (30 seconds).
        </p>
      </div>

      {/* Test Execution */}
      <div className="pt-2 border-t border-gray-200">
        <label htmlFor="test-input" className="block text-sm font-medium text-gray-700 mb-1">
          Test Input
        </label>
        <input
          id="test-input"
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="Enter test value (e.g., 'hello')"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-2"
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !code.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? 'Testing...' : 'Test'}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-3 rounded-md ${
            testResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {testResult.success ? (
            <>
              <p className="text-sm font-medium text-green-800 mb-1">Test Result:</p>
              <pre className="text-sm text-green-700 font-mono overflow-x-auto">
                {JSON.stringify(testResult.output, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
              <p className="text-sm text-red-700">{testResult.error}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
