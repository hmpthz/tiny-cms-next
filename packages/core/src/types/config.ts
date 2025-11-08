/**
 * Config types for tiny-cms
 * Simplified from Payload's 100+ options to ~10 essential options
 */

import type { Collection, FindOptions, FindResult } from './collection'
import type { AuthConfig, AuthOperations } from '../auth/types'

// Database adapter interface with enhanced typing
export interface DatabaseAdapter {
  /** Adapter name (e.g., 'postgres', 'mysql') */
  name?: string

  /** Connect to database */
  connect(): Promise<void>

  /** Disconnect from database */
  disconnect(): Promise<void>

  /** Execute CRUD operations with proper typing */
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  find(collection: string, options?: FindOptions): Promise<FindResult>
  findById(collection: string, id: string): Promise<Record<string, unknown> | null>
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>
  delete(collection: string, id: string): Promise<void>
  count(collection: string, options?: FindOptions): Promise<number>

  /**
   * Execute raw query (for advanced operations like full-text search)
   * Returns rows as array of objects
   */
  query?<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>

  /**
   * Create database index (for search optimization)
   */
  createIndex?(collection: string, fields: string[], type?: 'btree' | 'gin' | 'gist'): Promise<void>

  /** Optional transaction support */
  beginTransaction?(): Promise<string>
  commitTransaction?(id: string): Promise<void>
  rollbackTransaction?(id: string): Promise<void>
}

// Storage adapter interface (simplified)
export interface StorageAdapter {
  upload(file: File, path: string): Promise<{ url: string; key: string }>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

/**
 * Plugin type - transforms config
 * Plugins can add collections, inject hooks, modify existing collections, etc.
 */
export type Plugin = (config: Config) => Config

// Main CMS configuration
export interface Config {
  /** Database adapter */
  db: DatabaseAdapter

  /** Collections */
  collections: Collection[]

  /** Plugins to apply (executed sequentially) */
  plugins?: Plugin[]

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

/**
 * Build config by applying all plugins sequentially
 * This is inspired by Payload CMS's plugin system
 */
export function buildConfig(config: Config): Config {
  let finalConfig = { ...config }

  // Apply plugins sequentially if they exist
  if (config.plugins && config.plugins.length > 0) {
    for (const plugin of config.plugins) {
      finalConfig = plugin(finalConfig)
    }
  }

  return finalConfig
}

// Type helper to define config
export function defineConfig(config: Config): Config {
  return config
}
