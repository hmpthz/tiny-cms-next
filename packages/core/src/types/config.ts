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

  /**
   * Schema operations for database management
   */
  schema: {
    /** Create a table with columns */
    createTable(tableName: string, columns: TableColumn[]): Promise<void>

    /** Drop a table */
    dropTable(tableName: string): Promise<void>

    /** Check if a table exists */
    tableExists(tableName: string): Promise<boolean>

    /** Alter table (add/drop columns, change types, etc.) */
    alterTable?(tableName: string, changes: TableChanges): Promise<void>

    /** Run raw migration SQL */
    runMigration?(sql: string): Promise<void>

    /** Create tables for collections based on config */
    setupCollectionTables?(collections: Collection[]): Promise<void>
  }
}

/** Column definition for table creation */
export interface TableColumn {
  name: string
  type: 'text' | 'integer' | 'boolean' | 'json' | 'timestamp' | 'uuid' | 'decimal'
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
  defaultValue?: unknown
  references?: {
    table: string
    column: string
  }
}

/** Changes for altering tables */
export interface TableChanges {
  addColumns?: TableColumn[]
  dropColumns?: string[]
  renameColumns?: Array<{ from: string; to: string }>
  alterColumns?: Array<TableColumn & { name: string }>
}

// Storage adapter interface (simplified)
export interface StorageAdapter {
  upload(file: File, path: string): Promise<{ url: string; key: string }>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

import type { Hono } from 'hono'

/**
 * Plugin type - transforms config and optionally registers routes
 * Plugins can add collections, inject hooks, modify existing collections, register API routes, etc.
 */
export interface Plugin {
  /** Transform the config */
  (config: Config): Config

  /** Optional: Register routes with the Hono app */
  registerRoutes?: (app: Hono<any>) => void
}

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

  baseApiPath?: string
}

/**
 * Build config by applying all plugins sequentially
 * This is inspired by Payload CMS's plugin system
 */
export function buildConfig(config: Config, app?: Hono<any>): Config {
  let finalConfig = { ...config }

  // Apply plugins sequentially if they exist
  if (config.plugins && config.plugins.length > 0) {
    for (const plugin of config.plugins) {
      // Handle both function and object plugin types
      if (typeof plugin === 'function') {
        finalConfig = plugin(finalConfig)

        // Check if the function has a registerRoutes method
        if (app && 'registerRoutes' in plugin && plugin.registerRoutes) {
          plugin.registerRoutes(app)
        }
      } else {
        // This shouldn't happen with our types, but handle it gracefully
        console.warn('Invalid plugin type encountered')
      }
    }
  }

  return finalConfig
}

// Type helper to define config
export function defineConfig(config: Config): Config {
  return config
}
