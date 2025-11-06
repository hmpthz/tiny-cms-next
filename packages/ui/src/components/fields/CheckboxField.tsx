/**
 * CheckboxField component - for checkbox field type
 */

'use client'

import * as React from 'react'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'

export interface CheckboxFieldProps {
  name: string
  value?: boolean
  onChange?: (value: boolean) => void
  label?: string
  required?: boolean
  error?: string
  description?: string
  disabled?: boolean
}

export function CheckboxField({
  name,
  value = false,
  onChange,
  label,
  required,
  error,
  description,
  disabled,
}: CheckboxFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          name={name}
          checked={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
        />
        {label && (
          <Label htmlFor={name} className="cursor-pointer">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
      </div>
      {description && <p className="text-sm text-muted-foreground pl-6">{description}</p>}
      {error && <p className="text-sm text-destructive pl-6">{error}</p>}
    </div>
  )
}
