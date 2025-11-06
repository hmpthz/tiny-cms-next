/**
 * @tiny-cms/core
 * Core CMS logic for tiny-cms
 */

// Main CMS class
export { TinyCMS, createCMS } from './cms'

// Types
export type * from './types'
export { defineConfig } from './types'

// Auth types and utilities
export type * from './auth'
export { createAuthWrapper } from './auth'

// Validation utilities
export {
  fieldToZodSchema,
  collectionToZodSchema,
  validateData,
} from './validation/field-validation'
