/**
 * Core SDK types and interfaces
 */

import type { Where, Document } from '@tiny-cms/core'

/**
 * SDK configuration options
 */
export interface SDKConfig {
  /** Base URL of the API (e.g., 'http://localhost:3000') */
  baseUrl: string
  /** API prefix (default: '/api') */
  apiPrefix?: string
  /** Request headers to include with every request */
  defaultHeaders?: Record<string, string>
}

/**
 * Options for find operation
 *
 * sort format: "fieldName" for asc, "-fieldName" for desc, or "fieldName:asc" / "fieldName:desc"
 */
export interface FindOptions {
  collection: string
  where?: Where
  sort?: string
  limit?: number
  offset?: number
}

/**
 * Options for findById operation
 */
export interface FindByIdOptions {
  collection: string
  id: string
}

/**
 * Options for create operation
 */
export interface CreateOptions<T = unknown> {
  collection: string
  data: Partial<T>
  /** Optional file to upload (for collections with file fields) */
  file?: File | Blob
}

/**
 * Options for update operation
 */
export interface UpdateOptions<T = unknown> {
  collection: string
  id: string
  data: Partial<T>
  /** Optional file to upload (for collections with file fields) */
  file?: File | Blob
}

/**
 * Options for delete operation
 */
export interface DeleteOptions {
  collection: string
  id: string
}

/**
 * Options for count operation
 */
export interface CountOptions {
  collection: string
  where?: Where
}

/**
 * Count result
 */
export interface CountResult {
  totalDocs: number
}

/**
 * Options for login operation
 */
export interface LoginOptions {
  collection: string
  data: {
    email: string
    password: string
  }
}

/**
 * Options for me operation
 */
export interface MeOptions {
  collection: string
}

/**
 * Options for refresh token operation
 */
export interface RefreshTokenOptions {
  collection: string
}

/**
 * SDK error class
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'SDKError'
  }
}

/**
 * Internal request options
 */
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  file?: File | Blob
}

/**
 * Helper type to extract document type from collection name
 * Users can extend this interface to add type safety for their collections
 */
export interface CollectionDocumentMap {
  // Users can extend this via declaration merging
  // Example:
  // posts: Post
  // users: User
  [key: string]: Document
}

/**
 * Helper type to get document type from collection name
 */
export type GetCollectionDocument<T extends string> = T extends keyof CollectionDocumentMap
  ? CollectionDocumentMap[T]
  : Document
