'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Switch } from '@base-ui-components/react/switch'
import { MarkdownPreview } from './Markdown'
import type { AdminCollectionSummary } from '../types'
import type { Field, SelectField } from '@tiny-cms/core'

export interface DocumentFormProps {
  collection: AdminCollectionSummary
  initialValues?: Record<string, unknown>
  mode: 'create' | 'edit'
  onSubmit: (values: Record<string, unknown>) => Promise<void>
}

type FieldValues = Record<string, unknown>

function normalizeSelectOptions(field: SelectField) {
  return field.options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt,
  )
}

function buildInitialValues(
  collection: AdminCollectionSummary,
  initialValues?: FieldValues,
): FieldValues {
  const values: FieldValues = {}

  for (const field of collection.fields) {
    const existing = initialValues?.[field.name]
    if (existing !== undefined && existing !== null) {
      values[field.name] = existing
      continue
    }

    if (field.defaultValue !== undefined) {
      values[field.name] = field.defaultValue
      continue
    }

    switch (field.type) {
      case 'checkbox':
        values[field.name] = false
        break
      case 'select':
        values[field.name] = field.multiple ? [] : ''
        break
      default:
        values[field.name] = ''
    }
  }

  return values
}

function buildPayload(collection: AdminCollectionSummary, values: FieldValues): FieldValues {
  const payload: FieldValues = {}

  for (const field of collection.fields) {
    const raw = values[field.name]

    switch (field.type) {
      case 'number': {
        const num =
          typeof raw === 'number'
            ? raw
            : typeof raw === 'string' && raw.trim() !== ''
              ? Number(raw)
              : undefined
        if (num !== undefined && !Number.isNaN(num)) {
          payload[field.name] = num
        }
        break
      }
      case 'checkbox':
        payload[field.name] = Boolean(raw)
        break
      case 'select': {
        if (field.multiple) {
          if (Array.isArray(raw)) {
            payload[field.name] = raw.map((v) => String(v))
          } else if (typeof raw === 'string' && raw.trim() !== '') {
            payload[field.name] = raw.split(',').map((v) => v.trim())
          }
        } else if (typeof raw === 'string' && raw.trim() !== '') {
          payload[field.name] = raw
        }
        break
      }
      case 'date':
        if (raw instanceof Date) {
          payload[field.name] = raw
        } else if (typeof raw === 'string' && raw) {
          const date = new Date(raw)
          if (!Number.isNaN(date.getTime())) {
            payload[field.name] = date
          }
        }
        break
      default:
        if (raw !== undefined) {
          payload[field.name] = raw
        }
    }
  }

  return payload
}

export function DocumentForm({ collection, initialValues, mode, onSubmit }: DocumentFormProps) {
  const [values, setValues] = useState<FieldValues>(() =>
    buildInitialValues(collection, initialValues),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [richtextPreviewFields, setRichtextPreviewFields] = useState<Record<string, boolean>>({})

  const collectionLabel = useMemo(
    () => collection.labels?.singular || collection.labels?.plural || collection.name,
    [collection.labels, collection.name],
  )

  const handleChange = (field: Field, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [field.name]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      setIsSubmitting(true)
      const payload = buildPayload(collection, values)
      await onSubmit(payload)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save document'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {mode === 'create' ? 'Create' : 'Edit'} {collectionLabel}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Basic form generated from your collection fields. No validation is applied here.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {collection.fields.map((field) => {
          if (field.admin?.hidden) {
            return null
          }

          const label = field.label || field.name
          const value = values[field.name]

          if (field.type === 'checkbox') {
            const checked = Boolean(value)
            return (
              <label
                key={field.name}
                className="flex items-center gap-2 text-sm font-medium text-foreground"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={checked}
                  onChange={(event) => handleChange(field, event.target.checked)}
                />
                <span>
                  {label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </span>
              </label>
            )
          }

          if (field.type === 'select') {
            const selectField = field as SelectField
            const options = normalizeSelectOptions(selectField)
            const selectedValue = value

            return (
              <div key={field.name} className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor={field.name}>
                  {label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </label>
                <select
                  id={field.name}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  multiple={selectField.multiple}
                  value={
                    selectField.multiple
                      ? (Array.isArray(selectedValue)
                          ? selectedValue
                          : typeof selectedValue === 'string' && selectedValue
                            ? selectedValue.split(',').map((v) => v.trim())
                            : []) as string[]
                      : typeof selectedValue === 'string'
                        ? selectedValue
                        : ''
                  }
                  onChange={(event) => {
                    if (selectField.multiple) {
                      const selected = Array.from(
                        event.target.selectedOptions,
                        (option) => option.value,
                      )
                      handleChange(field, selected)
                    } else {
                      handleChange(field, event.target.value)
                    }
                  }}
                >
                  {!selectField.multiple && <option value="">Select an option</option>}
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {field.admin?.description && (
                  <p className="text-xs text-muted-foreground">{field.admin.description}</p>
                )}
              </div>
            )
          }

          if (field.type === 'richtext') {
            const textValue =
              typeof value === 'string' ? value : value != null ? String(value) : ''
            const previewEnabled = richtextPreviewFields[field.name] ?? false

            return (
              <div key={field.name} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor={field.name}>
                    {label}
                    {field.required && <span className="ml-1 text-destructive">*</span>}
                  </label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Edit</span>
                    <Switch.Root
                      checked={previewEnabled}
                      onCheckedChange={(checked: boolean) => {
                        setRichtextPreviewFields((prev) => ({
                          ...prev,
                          [field.name]: Boolean(checked),
                        }))
                      }}
                      className="inline-flex h-4 w-7 items-center rounded-full bg-muted data-[checked=true]:bg-primary transition-colors"
                    >
                      <Switch.Thumb className="h-3 w-3 rounded-full bg-background shadow transform data-[checked=true]:translate-x-3 translate-x-1 transition-transform" />
                    </Switch.Root>
                    <span>Preview</span>
                  </div>
                </div>

                {!previewEnabled ? (
                  <textarea
                    id={field.name}
                    className="mt-1 block min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={textValue}
                    onChange={(event) => handleChange(field, event.target.value)}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <MarkdownPreview>{textValue || ''}</MarkdownPreview>
                  </div>
                )}

                {field.admin?.description && (
                  <p className="text-xs text-muted-foreground">{field.admin.description}</p>
                )}
              </div>
            )
          }

          const inputType =
            field.type === 'email'
              ? 'email'
              : field.type === 'number'
                ? 'number'
                : field.type === 'date'
                  ? 'datetime-local'
                  : 'text'

          const stringValue =
            typeof value === 'string' ? value : value != null ? String(value) : ''

          return (
            <div key={field.name} className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor={field.name}>
                {label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </label>
              {field.type === 'relation' ? (
                <input
                  id={field.name}
                  type="text"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={stringValue}
                  onChange={(event) => handleChange(field, event.target.value)}
                  placeholder={`Related ${field.to} id (raw value)`}
                />
              ) : (
                <input
                  id={field.name}
                  type={inputType}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={stringValue}
                  onChange={(event) => handleChange(field, event.target.value)}
                />
              )}
              {field.admin?.description && (
                <p className="text-xs text-muted-foreground">{field.admin.description}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
