/**
 * Access control types for tiny-cms
 * Function-based permissions inspired by Payload's pattern
 */

import type { Where } from './collection'

// Context passed to access control functions
export interface AccessContext {
  /** Current user (from better-auth session) */
  user?: {
    id: string
    email: string
    role?: string
    [key: string]: unknown
  }
  /** Request data for create/update operations */
  data?: Record<string, unknown>
  /** Existing document for update/delete operations */
  doc?: Record<string, unknown>
}

// Access function return types
export type AccessResult = boolean | Where

// Access function type
export type AccessFunction = (context: AccessContext) => AccessResult | Promise<AccessResult>

// Access control configuration
export interface AccessControl {
  /** Control who can create documents */
  create?: AccessFunction

  /** Control who can read documents */
  read?: AccessFunction

  /** Control who can update documents */
  update?: AccessFunction

  /** Control who can delete documents */
  delete?: AccessFunction
}
