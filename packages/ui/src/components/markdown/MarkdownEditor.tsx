/**
 * Markdown Editor component
 * Uses @uiw/react-md-editor for editing with live preview
 */

'use client'

import MDEditor from '@uiw/react-md-editor'
import { cn } from '../../lib/utils'

// Import MDEditor styles
import '@uiw/react-md-editor/markdown-editor.css'

export interface MarkdownEditorProps {
  value?: string
  onChange?: (value?: string) => void
  className?: string
  height?: number
  placeholder?: string
}

export function MarkdownEditor({
  value,
  onChange,
  className,
  height = 400,
  placeholder = 'Write your markdown here...',
}: MarkdownEditorProps) {
  return (
    <div className={cn('w-full', className)} data-color-mode="light">
      <MDEditor
        value={value}
        onChange={onChange}
        height={height}
        preview="live"
        textareaProps={{
          placeholder,
        }}
        previewOptions={{
          rehypePlugins: [],
        }}
      />
    </div>
  )
}
