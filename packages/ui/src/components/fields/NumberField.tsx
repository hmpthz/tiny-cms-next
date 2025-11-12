/**
 * NumberField component - for number field type
 */

'use client'

import * as React from 'react'
import { Input } from '../ui/input'
import { FieldWrapper } from './FieldWrapper'

export interface NumberFieldProps {
  name: string
  value?: number
  onChange?: (value: number | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function NumberField({
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
  step,
  disabled,
}: NumberFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange?.(val === '' ? undefined : Number(val))
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
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        required={required}
      />
    </FieldWrapper>
  )
}
