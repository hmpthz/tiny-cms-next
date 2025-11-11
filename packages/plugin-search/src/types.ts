/**
 * Search types for tiny-cms PostgreSQL full-text search
 */

import type { Kysely } from 'kysely'

/**
 * Search configuration for a collection
 */
export interface SearchableCollection {
  /** Collection/table name */
  name: string
  /** Fields to include in search index */
  searchFields: string[]
  /** Language for text search (default: 'english') */
  language?: string
  /** Weight for ranking (higher = more important) */
  weight?: number
}

/**
 * Search configuration options
 */
export interface SearchConfig {
  /** Collections to enable search on */
  collections: SearchableCollection[]
  /** Default language for text search */
  defaultLanguage?: string
}

/**
 * Search result with ranking
 */
export interface SearchResult<T = any> {
  /** The matched document */
  document: T
  /** Collection name */
  collection: string
  /** Search rank (higher = better match) */
  rank: number
}

/**
 * Search query options
 */
export interface SearchQueryOptions {
  /** Search query string */
  query: string
  /** Collections to search in (if omitted, search all configured) */
  collections?: string[]
  /** Maximum number of results per collection */
  limit?: number
  /** Language for search (default: 'english') */
  language?: string
  /** Minimum rank threshold */
  minRank?: number
}

/**
 * Database instance type (generic to avoid tight coupling)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = Kysely<any>
