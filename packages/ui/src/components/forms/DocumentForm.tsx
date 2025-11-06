/**
 * DocumentForm - Dynamic form for creating/editing documents
 * Uses React Hook Form for form state management
 */

'use client'

import { useForm } from 'react-hook-form'
import type { Field, SelectField as SelectFieldType, RelationField as RelationFieldType } from '@tiny-cms/core'
import { Button } from '../ui/button'
import { TextField } from '../fields/TextField'
import { NumberField } from '../fields/NumberField'
import { EmailField } from '../fields/EmailField'
import { SelectField } from '../fields/SelectField'
import { CheckboxField } from '../fields/CheckboxField'
import { DateField } from '../fields/DateField'
import { RelationField } from '../fields/RelationField'
import { RichTextField } from '../fields/RichTextField'
import type { SelectOption } from '../fields/SelectField'
import type { RelationOption } from '../fields/RelationField'

export interface DocumentFormProps {
  fields: Field[]
  defaultValues?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void
  submitLabel?: string
  loading?: boolean
  relationOptions?: Record<string, RelationOption[]>
}

export function DocumentForm({
  fields,
  defaultValues = {},
  onSubmit,
  submitLabel = 'Save',
  loading,
  relationOptions = {},
}: DocumentFormProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
  })

  const renderField = (field: Field) => {
    const value = watch(field.name)
    const error = errors[field.name]?.message as string | undefined

    const commonProps = {
      name: field.name,
      label: field.label || field.name,
      required: field.required,
      error,
      description: field.admin?.description,
    }

    switch (field.type) {
      case 'text':
        return (
          <TextField
            {...commonProps}
            value={value as string}
            onChange={(val) => setValue(field.name, val)}
            maxLength={field.maxLength}
          />
        )

      case 'number':
        return (
          <NumberField
            {...commonProps}
            value={value as number}
            onChange={(val) => setValue(field.name, val)}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        )

      case 'email':
        return (
          <EmailField
            {...commonProps}
            value={value as string}
            onChange={(val) => setValue(field.name, val)}
          />
        )

      case 'select': {
        const selectField = field as SelectFieldType
        // Normalize options to SelectOption format
        const options = (selectField.options || []).map((opt) =>
          typeof opt === 'string' ? { label: opt, value: opt } : opt
        ) as SelectOption[]

        return (
          <SelectField
            {...commonProps}
            value={value as string | string[]}
            onChange={(val) => setValue(field.name, val)}
            options={options}
            multiple={selectField.multiple}
          />
        )
      }

      case 'checkbox':
        return (
          <CheckboxField
            {...commonProps}
            value={value as boolean}
            onChange={(val) => setValue(field.name, val)}
          />
        )

      case 'date':
        return (
          <DateField
            {...commonProps}
            value={value as Date | string}
            onChange={(val) => setValue(field.name, val)}
          />
        )

      case 'relation': {
        const relationField = field as RelationFieldType
        return (
          <RelationField
            {...commonProps}
            value={value as string | string[]}
            onChange={(val) => setValue(field.name, val)}
            relationTo={relationField.to}
            options={relationOptions[relationField.to] || []}
            hasMany={relationField.multiple}
          />
        )
      }

      case 'richtext':
        return (
          <RichTextField
            {...commonProps}
            value={value as string}
            onChange={(val) => setValue(field.name, val)}
          />
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field) => (
        <div key={field.name}>{renderField(field)}</div>
      ))}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
