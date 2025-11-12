/**
 * SelectField component - for select field type
 */

'use client'

import * as React from 'react'
import { Select } from '../ui/select'
import { FieldWrapper } from './FieldWrapper'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectFieldProps {
  name: string
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  options: SelectOption[]
  multiple?: boolean
  disabled?: boolean
}

export function SelectField({
  name,
  value,
  onChange,
  label,
  placeholder,
  required,
  error,
  description,
  options,
  multiple,
  disabled,
}: SelectFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions, (option) => option.value)
      onChange?.(selected)
    } else {
      onChange?.(e.target.value)
    }
  }

  const selectValue = Array.isArray(value) ? value : value ? [value] : []

  return (
    <FieldWrapper
      label={label}
      name={name}
      required={required}
      error={error}
      description={description}
    >
      <Select
        id={name}
        name={name}
        value={multiple ? undefined : (value as string) || ''}
        onChange={handleChange}
        multiple={multiple}
        disabled={disabled}
        required={required}
      >
        {!multiple && placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            selected={multiple ? selectValue.includes(option.value) : undefined}
          >
            {option.label}
          </option>
        ))}
      </Select>
    </FieldWrapper>
  )
}
