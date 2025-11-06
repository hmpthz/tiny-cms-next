/**
 * RelationField component - for relation field type
 * Allows selecting related documents from another collection
 */

'use client'

import * as React from 'react'
import { Select } from '../ui/select'
import { FieldWrapper } from './FieldWrapper'

export interface RelationOption {
  id: string
  label: string
}

export interface RelationFieldProps {
  name: string
  value?: string | string[]
  onChange?: (value: string | string[] | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  description?: string
  relationTo: string
  options: RelationOption[]
  hasMany?: boolean
  disabled?: boolean
  loading?: boolean
}

export function RelationField({
  name,
  value,
  onChange,
  label,
  placeholder,
  required,
  error,
  description,
  relationTo,
  options,
  hasMany,
  disabled,
  loading,
}: RelationFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (hasMany) {
      const selected = Array.from(e.target.selectedOptions, (option) => option.value)
      onChange?.(selected.length > 0 ? selected : undefined)
    } else {
      const val = e.target.value
      onChange?.(val || undefined)
    }
  }

  const selectValue = Array.isArray(value) ? value : value ? [value] : []

  return (
    <FieldWrapper label={label} name={name} required={required} error={error} description={description}>
      <Select
        id={name}
        name={name}
        value={hasMany ? undefined : (value as string) || ''}
        onChange={handleChange}
        multiple={hasMany}
        disabled={disabled || loading}
        required={required}
      >
        {!hasMany && placeholder && (
          <option value="" disabled={required}>
            {loading ? 'Loading...' : placeholder || `Select ${relationTo}`}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
            selected={hasMany ? selectValue.includes(option.id) : undefined}
          >
            {option.label}
          </option>
        ))}
      </Select>
      {hasMany && (
        <p className="text-xs text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple</p>
      )}
    </FieldWrapper>
  )
}
