/**
 * Collection types for tiny-cms
 * Simplified from Payload's complex collection config
 */

import type { Field } from './field'
import type { AccessControl } from './access'
import type { CollectionHooks } from './hooks'

// Collection configuration
export interface Collection {
  /** Collection name (used as table name) */
  name: string

  /** Field definitions */
  fields: Field[]

  /** Access control functions */
  access?: AccessControl

  /** Lifecycle hooks */
  hooks?: CollectionHooks

  /** Enable timestamps (createdAt, updatedAt) */
  timestamps?: boolean

  /** Enable soft delete */
  softDelete?: boolean

  /** Custom labels */
  labels?: {
    singular?: string
    plural?: string
  }
}

// Document type with metadata
export interface Document {
  id: string
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
  [key: string]: unknown
}

// Query operators for filtering
export interface WhereOperator {
  equals?: unknown
  not?: unknown
  in?: unknown[]
  notIn?: unknown[]
  lt?: number | Date
  lte?: number | Date
  gt?: number | Date
  gte?: number | Date
  contains?: string
  startsWith?: string
  endsWith?: string
}

// Where clause for queries
export type Where = {
  [key: string]: unknown | WhereOperator | Where[]
  AND?: Where[]
  OR?: Where[]
}

// Sort order
export type SortOrder = 'asc' | 'desc'

// Order by clause
export type OrderBy = {
  [key: string]: SortOrder
}

// Query options
export interface FindOptions {
  where?: Where
  orderBy?: OrderBy
  limit?: number
  offset?: number
}

// Query result
export interface FindResult<T = Document> {
  docs: T[]
  totalDocs: number
  limit: number
  offset: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}
