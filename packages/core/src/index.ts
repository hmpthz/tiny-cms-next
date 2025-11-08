/**
 * @tiny-cms/core
 * Core CMS logic for tiny-cms
 */

// Main CMS class
export { TinyCMS, createCMS, getCMS } from './cms'

// Types
export type * from './types'
export { defineConfig, buildConfig } from './types'

// Auth types and utilities
export type * from './auth'
export { createAuthWrapper, createAuth } from './auth'

// Validation utilities
export {
  fieldToZodSchema,
  collectionToZodSchema,
  validateData,
} from './validation/field-validation'

// Re-export zod for external schema validation
export { z } from 'zod'
