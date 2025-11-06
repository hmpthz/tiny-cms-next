/**
 * Core field types for tiny-cms
 * Simplified from Payload's 30+ field types to 8 essential types
 */

// Base field configuration
export interface BaseField {
  name: string
  label?: string
  required?: boolean
  unique?: boolean
  defaultValue?: unknown
  admin?: {
    hidden?: boolean
    readOnly?: boolean
    description?: string
  }
}

// Text field - for short text input
export interface TextField extends BaseField {
  type: 'text'
  minLength?: number
  maxLength?: number
}

// Number field - for numeric input
export interface NumberField extends BaseField {
  type: 'number'
  min?: number
  max?: number
  step?: number
}

// Email field - for email addresses
export interface EmailField extends BaseField {
  type: 'email'
}

// Select field - for dropdown selection
export interface SelectField extends BaseField {
  type: 'select'
  options: Array<
    | string
    | {
        label: string
        value: string
      }
  >
  multiple?: boolean
}

// Checkbox field - for boolean values
export interface CheckboxField extends BaseField {
  type: 'checkbox'
}

// Date field - for date/time values
export interface DateField extends BaseField {
  type: 'date'
  time?: boolean // Include time component
}

// Relation field - for references to other collections
export interface RelationField extends BaseField {
  type: 'relation'
  to: string // Collection name
  multiple?: boolean
}

// RichText field - for markdown content
export interface RichTextField extends BaseField {
  type: 'richtext'
}

// Union type of all field types
export type Field =
  | TextField
  | NumberField
  | EmailField
  | SelectField
  | CheckboxField
  | DateField
  | RelationField
  | RichTextField

// Field value types - maps field types to their value types
export type FieldValue<T extends Field> = T extends TextField
  ? string
  : T extends NumberField
    ? number
    : T extends EmailField
      ? string
      : T extends SelectField
        ? T['multiple'] extends true
          ? string[]
          : string
        : T extends CheckboxField
          ? boolean
          : T extends DateField
            ? Date
            : T extends RelationField
              ? T['multiple'] extends true
                ? string[]
                : string
              : T extends RichTextField
                ? string
                : never
