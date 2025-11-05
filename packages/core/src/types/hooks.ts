/**
 * Hook types for tiny-cms
 * Simplified from Payload's 10+ hook points to 3 essential hooks
 */

// Hook context
export interface HookContext {
  /** Collection name */
  collection: string

  /** Operation type */
  operation: 'create' | 'update' | 'delete' | 'find' | 'findById'

  /** Current user */
  user?: {
    id: string
    email: string
    role?: string
    [key: string]: unknown
  }

  /** Original data (for update operations) */
  originalDoc?: Record<string, unknown>
}

// beforeChange hook - runs before validation and save
export type BeforeChangeHook = (args: {
  data: Record<string, unknown>
  context: HookContext
}) => Promise<Record<string, unknown>> | Record<string, unknown>

// afterChange hook - runs after save
export type AfterChangeHook = (args: {
  doc: Record<string, unknown>
  context: HookContext
  previousDoc?: Record<string, unknown>
}) => Promise<void> | void

// beforeRead hook - runs before returning documents
export type BeforeReadHook = (args: {
  doc: Record<string, unknown>
  context: HookContext
}) => Promise<Record<string, unknown>> | Record<string, unknown>

// Collection hooks
export interface CollectionHooks {
  /** Runs before validation and save (create/update) */
  beforeChange?: BeforeChangeHook

  /** Runs after save (create/update) */
  afterChange?: AfterChangeHook

  /** Runs before returning documents (find/findById) */
  beforeRead?: BeforeReadHook
}
