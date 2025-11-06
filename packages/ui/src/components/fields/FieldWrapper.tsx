/**
 * FieldWrapper - Common wrapper for form fields
 * Provides label, error message, and description
 */

import * as React from 'react'
import { Label } from '../ui/label'
import { cn } from '../../lib/utils'

export interface FieldWrapperProps {
  label?: string
  name: string
  required?: boolean
  error?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FieldWrapper({
  label,
  name,
  required,
  error,
  description,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
