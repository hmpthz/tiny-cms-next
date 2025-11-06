/**
 * RichTextField component - for richtext field type
 * Uses markdown editor for rich text content
 */

'use client'

import { MarkdownEditor } from '../markdown/MarkdownEditor'
import { FieldWrapper } from './FieldWrapper'

export interface RichTextFieldProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  height?: number
  disabled?: boolean
}

export function RichTextField({
  name,
  value = '',
  onChange,
  label,
  placeholder,
  required,
  error,
  description,
  height = 400,
  disabled,
}: RichTextFieldProps) {
  return (
    <FieldWrapper label={label} name={name} required={required} error={error} description={description}>
      <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
        <MarkdownEditor
          value={value}
          onChange={(val) => onChange?.(val || '')}
          height={height}
          placeholder={placeholder}
        />
      </div>
    </FieldWrapper>
  )
}
