/**
 * EmailField component - for email field type
 */

'use client'

import * as React from 'react'
import { Input } from '../ui/input'
import { FieldWrapper } from './FieldWrapper'

export interface EmailFieldProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  disabled?: boolean
}

export function EmailField({
  name,
  value = '',
  onChange,
  label,
  placeholder,
  required,
  error,
  description,
  disabled,
}: EmailFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <Input
        id={name}
        name={name}
        type="email"
        value={value}
        onChange={handleChange}
        placeholder={placeholder || 'email@example.com'}
        disabled={disabled}
        required={required}
      />
    </FieldWrapper>
  )
}
