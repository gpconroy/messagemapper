'use client'

interface CustomJSEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

/**
 * Reusable JavaScript code editor component
 * Features: monospace font, dark theme, tab key handling
 */
export function CustomJSEditor({
  value,
  onChange,
  placeholder = '// Write your JavaScript code here',
  minHeight = 150,
}: CustomJSEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key to insert spaces instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start = target.selectionStart
      const end = target.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      // Set cursor position after inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={{ minHeight: `${minHeight}px` }}
      className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-green-400 placeholder-green-600"
    />
  )
}
