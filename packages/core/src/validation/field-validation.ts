/**
 * Field validation using Zod
 * Converts field definitions to Zod schemas for runtime validation
 */

import { z } from 'zod'
import type { Field } from '../types'

/**
 * Converts a field definition to a Zod schema
 */
export function fieldToZodSchema(field: Field): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (field.type) {
    case 'text':
    case 'email': {
      schema = z.string()

      if (field.type === 'email') {
        schema = (schema as z.ZodString).email('Invalid email address')
      }

      if ('minLength' in field && field.minLength !== undefined) {
        schema = (schema as z.ZodString).min(
          field.minLength,
          `Minimum length is ${field.minLength}`,
        )
      }

      if ('maxLength' in field && field.maxLength !== undefined) {
        schema = (schema as z.ZodString).max(
          field.maxLength,
          `Maximum length is ${field.maxLength}`,
        )
      }

      break
    }

    case 'number': {
      schema = z.number()

      if (field.min !== undefined) {
        schema = (schema as z.ZodNumber).min(field.min, `Minimum value is ${field.min}`)
      }

      if (field.max !== undefined) {
        schema = (schema as z.ZodNumber).max(field.max, `Maximum value is ${field.max}`)
      }

      break
    }

    case 'checkbox': {
      schema = z.boolean()
      break
    }

    case 'date': {
      schema = z.union([z.string().datetime(), z.date()])
      break
    }

    case 'select': {
      const options = field.options.map((opt) => (typeof opt === 'string' ? opt : opt.value)) as [
        string,
        ...string[],
      ]

      if (field.multiple) {
        schema = z.array(z.enum(options))
      } else {
        schema = z.enum(options)
      }

      break
    }

    case 'relation': {
      if (field.multiple) {
        schema = z.array(z.string())
      } else {
        schema = z.string()
      }

      break
    }

    case 'richtext': {
      schema = z.string()
      break
    }

    default: {
      // Fallback for any unknown field types
      schema = z.unknown()
      break
    }
  }

  // Handle required validation
  if (!field.required) {
    schema = schema.optional()
  }

  // Handle default value
  if (field.defaultValue !== undefined) {
    schema = schema.default(field.defaultValue)
  }

  return schema
}

/**
 * Creates a Zod schema for a collection based on its fields
 */
export function collectionToZodSchema(fields: Field[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    shape[field.name] = fieldToZodSchema(field)
  }

  return z.object(shape)
}

/**
 * Validates data against a collection's field schema
 */
export async function validateData(
  fields: Field[],
  data: Record<string, unknown>,
): Promise<
  { success: true; data: Record<string, unknown> } | { success: false; errors: string[] }
> {
  const schema = collectionToZodSchema(fields)

  const result = await schema.safeParseAsync(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)

  return { success: false, errors }
}
