/**
 * TextField component - for text field type
 */

'use client'

import * as React from 'react'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { FieldWrapper } from './FieldWrapper'

export interface TextFieldProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  multiline?: boolean
  rows?: number
  maxLength?: number
  disabled?: boolean
}

export function TextField({
  name,
  value = '',
  onChange,
  label,
  placeholder,
  required,
  error,
  description,
  multiline,
  rows = 4,
  maxLength,
  disabled,
}: TextFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <FieldWrapper
      label={label}
      name={name}
      required={required}
      error={error}
      description={description}
    >
      {multiline ? (
        <Textarea
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
        />
      )}
    </FieldWrapper>
  )
}
