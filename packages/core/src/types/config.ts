/**
 * Config types for tiny-cms
 * Simplified from Payload's 100+ options to ~10 essential options
 */

import type { Collection } from './collection'
import type { AuthConfig, AuthOperations } from '../auth/types'

// Database adapter interface
export interface DatabaseAdapter {
  /** Connect to database */
  connect(): Promise<void>

  /** Disconnect from database */
  disconnect(): Promise<void>

  /** Execute CRUD operations */
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  find(collection: string, options?: unknown): Promise<unknown>
  findById(collection: string, id: string): Promise<Record<string, unknown> | null>
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>
  delete(collection: string, id: string): Promise<void>
  count(collection: string, options?: unknown): Promise<number>
}

// Storage adapter interface (simplified)
export interface StorageAdapter {
  upload(file: File, path: string): Promise<{ url: string; key: string }>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

// Main CMS configuration
export interface Config {
  /** Database adapter */
  db: DatabaseAdapter

  /** Collections */
  collections: Collection[]

  /** Authentication configuration (optional) */
  auth?: {
    /** Auth operations (created from better-auth) */
    operations: AuthOperations
    /** Auth configuration */
    config: AuthConfig
  }

  /** Storage adapter (optional) */
  storage?: StorageAdapter

  /** Secret for encryption/JWT */
  secret?: string

  /** Server URL */
  serverURL?: string
}

// Type helper to define config
export function defineConfig(config: Config): Config {
  return config
}
