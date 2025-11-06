/**
 * TinyCMS SDK - Type-safe client for tiny-cms
 */

import type { FindResult } from '@tiny-cms/core'
import type {
  SDKConfig,
  FindOptions,
  FindByIdOptions,
  CreateOptions,
  UpdateOptions,
  DeleteOptions,
  CountOptions,
  CountResult,
  LoginOptions,
  MeOptions,
  RefreshTokenOptions,
  RequestOptions,
  GetCollectionDocument,
} from './types'
import { SDKError } from './types'

/**
 * Main SDK class for interacting with tiny-cms API
 */
export class TinyCMSSDK {
  private readonly baseUrl: string
  private readonly apiPrefix: string
  private readonly defaultHeaders: Record<string, string>

  constructor(config: SDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.apiPrefix = config.apiPrefix ?? '/api'
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    }
  }

  /**
   * Find documents in a collection
   */
  async find<C extends string>(
    options: FindOptions & { collection: C }
  ): Promise<FindResult<GetCollectionDocument<C>>> {
    const { collection, where, sort, limit, offset } = options

    const query: Record<string, string> = {}
    if (where) query.where = JSON.stringify(where)
    if (sort) query.sort = sort
    if (limit !== undefined) query.limit = String(limit)
    if (offset !== undefined) query.offset = String(offset)

    return this.request<FindResult<GetCollectionDocument<C>>>({
      method: 'GET',
      path: `/collections/${collection}`,
      query,
    })
  }

  /**
   * Find a document by ID
   */
  async findById<C extends string>(
    options: FindByIdOptions
  ): Promise<GetCollectionDocument<C>> {
    const { collection, id } = options

    return this.request<GetCollectionDocument<C>>({
      method: 'GET',
      path: `/collections/${collection}/${id}`,
    })
  }

  /**
   * Create a new document
   */
  async create<C extends string>(
    options: CreateOptions<GetCollectionDocument<C>>
  ): Promise<GetCollectionDocument<C>> {
    const { collection, data, file } = options

    return this.request<GetCollectionDocument<C>>({
      method: 'POST',
      path: `/collections/${collection}`,
      body: data,
      file,
    })
  }

  /**
   * Update a document by ID
   */
  async update<C extends string>(
    options: UpdateOptions<GetCollectionDocument<C>>
  ): Promise<GetCollectionDocument<C>> {
    const { collection, id, data, file } = options

    return this.request<GetCollectionDocument<C>>({
      method: 'PATCH',
      path: `/collections/${collection}/${id}`,
      body: data,
      file,
    })
  }

  /**
   * Delete a document by ID
   */
  async delete(options: DeleteOptions): Promise<void> {
    const { collection, id } = options

    await this.request<void>({
      method: 'DELETE',
      path: `/collections/${collection}/${id}`,
    })
  }

  /**
   * Count documents in a collection
   */
  async count(options: CountOptions): Promise<CountResult> {
    const { collection, where } = options

    const query: Record<string, string> = {}
    if (where) query.where = JSON.stringify(where)

    return this.request<CountResult>({
      method: 'GET',
      path: `/collections/${collection}/count`,
      query,
    })
  }

  /**
   * Login with email and password
   */
  async login<C extends string>(
    options: LoginOptions
  ): Promise<GetCollectionDocument<C>> {
    const { collection, data } = options

    return this.request<GetCollectionDocument<C>>({
      method: 'POST',
      path: `/auth/${collection}/login`,
      body: data,
    })
  }

  /**
   * Get current authenticated user
   */
  async me<C extends string>(options: MeOptions): Promise<GetCollectionDocument<C>> {
    const { collection } = options

    return this.request<GetCollectionDocument<C>>({
      method: 'GET',
      path: `/auth/${collection}/me`,
    })
  }

  /**
   * Refresh authentication token
   */
  async refreshToken<C extends string>(
    options: RefreshTokenOptions
  ): Promise<GetCollectionDocument<C>> {
    const { collection } = options

    return this.request<GetCollectionDocument<C>>({
      method: 'POST',
      path: `/auth/${collection}/refresh`,
    })
  }

  /**
   * Internal method to make HTTP requests
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, query, body, file } = options

    // Build URL with query parameters
    let url = `${this.baseUrl}${this.apiPrefix}${path}`
    if (query) {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    // Prepare headers and body
    let headers = { ...this.defaultHeaders }
    let requestBody: FormData | string | undefined

    if (file) {
      // Use FormData for file uploads
      const formData = new FormData()
      formData.append('file', file)
      if (body) {
        formData.append('data', JSON.stringify(body))
      }
      requestBody = formData
      // Remove Content-Type header to let browser set it with boundary
      delete headers['Content-Type']
    } else if (body) {
      // Use JSON for regular requests
      requestBody = JSON.stringify(body)
    }

    // Make the request
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        credentials: 'include', // Include cookies for auth
      })

      // Handle non-2xx responses
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`
        let errorData: unknown

        try {
          errorData = await response.json()
          if (errorData && typeof errorData === 'object' && 'message' in errorData) {
            errorMessage = String(errorData.message)
          }
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }

        throw new SDKError(errorMessage, response.status, errorData)
      }

      // Handle 204 No Content (e.g., DELETE)
      if (response.status === 204) {
        return undefined as unknown as T
      }

      // Parse JSON response
      return (await response.json()) as T
    } catch (error) {
      // Re-throw SDKError as-is
      if (error instanceof SDKError) {
        throw error
      }

      // Wrap other errors in SDKError
      if (error instanceof Error) {
        throw new SDKError(`Network error: ${error.message}`)
      }

      throw new SDKError('Unknown error occurred')
    }
  }
}
