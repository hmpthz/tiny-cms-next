/**
 * DateField component - for date field type
 */

'use client'

import * as React from 'react'
import { Input } from '../ui/input'
import { FieldWrapper } from './FieldWrapper'
import { formatDateForInput } from '../../lib/utils'

export interface DateFieldProps {
  name: string
  value?: Date | string
  onChange?: (value: Date | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  min?: string
  max?: string
  disabled?: boolean
}

export function DateField({
  name,
  value,
  onChange,
  label,
  placeholder,
  required,
  error,
  description,
  min,
  max,
  disabled,
}: DateFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange?.(val ? new Date(val) : undefined)
  }

  const dateValue = formatDateForInput(value)

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
        type="date"
        value={dateValue}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
      />
    </FieldWrapper>
  )
}
