/**
 * Main TinyCMS class
 * Provides CRUD operations with hooks, validation, and access control
 */

import {
  type Config,
  type Collection,
  type Document,
  type FindOptions,
  type FindResult,
  type HookContext,
  type AccessContext,
  buildConfig,
} from './types'
import { validateData } from './validation/field-validation'

export class TinyCMS {
  private config: Config
  private collections: Map<string, Collection>

  constructor(config: Config) {
    this.config = config
    this.collections = new Map()

    // Index collections by name
    for (const collection of config.collections) {
      this.collections.set(collection.name, collection)
    }
  }

  /**
   * Get CMS config
   */
  getConfig(): Config {
    return this.config
  }

  /**
   * Get database adapter
   */
  getDb() {
    return this.config.db
  }

  /**
   * Get auth operations if auth is configured
   */
  get auth() {
    if (!this.config.auth) {
      throw new Error('Authentication is not configured')
    }
    return this.config.auth.operations
  }

  /**
   * Initialize the CMS (connect to database)
   */
  async init(): Promise<void> {
    await this.config.db.connect()
  }

  /**
   * Shutdown the CMS (disconnect from database)
   */
  async shutdown(): Promise<void> {
    await this.config.db.disconnect()
  }

  /**
   * Get a collection by name
   */
  private getCollection(name: string): Collection {
    const collection = this.collections.get(name)
    if (!collection) {
      throw new Error(`Collection "${name}" not found`)
    }
    return collection
  }

  /**
   * Execute access control check
   */
  private async checkAccess(
    collection: Collection,
    operation: 'create' | 'read' | 'update' | 'delete',
    context: AccessContext,
  ): Promise<boolean | Record<string, unknown>> {
    if (!collection.access || !collection.access[operation]) {
      return true // Allow by default if no access control defined
    }

    const accessFn = collection.access[operation]
    if (!accessFn) {
      return true
    }

    const result = await accessFn(context)
    return result
  }

  /**
   * Create a new document
   */
  async create<T extends Document = Document>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    user?: AccessContext['user'],
  ): Promise<T> {
    const collection = this.getCollection(collectionName)

    // Create hook context
    const hookContext: HookContext = {
      collection: collectionName,
      operation: 'create',
      user,
    }

    // Check access control
    const accessResult = await this.checkAccess(collection, 'create', { user, data })
    if (accessResult === false) {
      throw new Error(`Access denied for creating ${collectionName}`)
    }

    // Run beforeChange hook
    let processedData: Record<string, unknown> = { ...data }
    if (collection.hooks?.beforeChange) {
      processedData = await collection.hooks.beforeChange({
        data: processedData,
        context: hookContext,
      })
    }

    // Validate data
    const validation = await validateData(collection.fields, processedData)
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Create document in database
    const doc = await this.config.db.create(collectionName, validation.data)

    // Run afterChange hook
    if (collection.hooks?.afterChange) {
      await collection.hooks.afterChange({
        doc,
        context: hookContext,
      })
    }

    return doc as T
  }

  /**
   * Find documents
   */
  async find<T extends Document = Document>(
    collectionName: string,
    options: FindOptions = {},
    user?: AccessContext['user'],
  ): Promise<FindResult<T>> {
    const collection = this.getCollection(collectionName)

    // Check access control
    const accessResult = await this.checkAccess(collection, 'read', { user })

    // Merge access control constraints with query
    if (typeof accessResult === 'object') {
      options.where = options.where ? { AND: [options.where, accessResult] } : accessResult
    } else if (accessResult === false) {
      throw new Error(`Access denied for reading ${collectionName}`)
    }

    // Execute find query
    const result = (await this.config.db.find(collectionName, options)) as FindResult<T>

    // Run beforeRead hook on each document
    if (collection.hooks?.beforeRead) {
      const hookContext: HookContext = {
        collection: collectionName,
        operation: 'find',
        user,
      }

      result.docs = (await Promise.all(
        result.docs.map((doc) =>
          collection.hooks!.beforeRead!({
            doc: doc as Record<string, unknown>,
            context: hookContext,
          }),
        ),
      )) as T[]
    }

    return result as FindResult<T>
  }

  /**
   * Find a document by ID
   */
  async findById<T extends Document = Document>(
    collectionName: string,
    id: string,
    user?: AccessContext['user'],
  ): Promise<T | null> {
    const collection = this.getCollection(collectionName)

    // Check access control
    const accessResult = await this.checkAccess(collection, 'read', { user })
    if (accessResult === false) {
      throw new Error(`Access denied for reading ${collectionName}`)
    }

    // Execute findById query
    let doc = await this.config.db.findById(collectionName, id)

    if (!doc) {
      return null
    }

    // If access control returns a where clause, check if doc matches
    if (typeof accessResult === 'object') {
      // TODO: Implement where clause matching against doc
      // For now, just return the doc
    }

    // Run beforeRead hook
    if (collection.hooks?.beforeRead) {
      const hookContext: HookContext = {
        collection: collectionName,
        operation: 'findById',
        user,
      }

      doc = await collection.hooks.beforeRead({
        doc,
        context: hookContext,
      })
    }

    return doc as T
  }

  /**
   * Update a document
   */
  async update<T extends Document = Document>(
    collectionName: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
    user?: AccessContext['user'],
  ): Promise<T> {
    const collection = this.getCollection(collectionName)

    // Get existing document
    const existingDoc = await this.config.db.findById(collectionName, id)
    if (!existingDoc) {
      throw new Error(`Document with ID "${id}" not found in collection "${collectionName}"`)
    }

    // Create hook context
    const hookContext: HookContext = {
      collection: collectionName,
      operation: 'update',
      user,
      originalDoc: existingDoc,
    }

    // Check access control
    const accessResult = await this.checkAccess(collection, 'update', {
      user,
      data,
      doc: existingDoc,
    })
    if (accessResult === false) {
      throw new Error(`Access denied for updating ${collectionName}`)
    }

    // Run beforeChange hook
    let processedData: Record<string, unknown> = { ...data }
    if (collection.hooks?.beforeChange) {
      processedData = await collection.hooks.beforeChange({
        data: processedData,
        context: hookContext,
      })
    }

    // Validate data (partial validation for updates)
    const validation = await validateData(collection.fields, {
      ...existingDoc,
      ...processedData,
    })
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Update document in database
    const doc = await this.config.db.update(collectionName, id, processedData)

    // Run afterChange hook
    if (collection.hooks?.afterChange) {
      await collection.hooks.afterChange({
        doc,
        context: hookContext,
        previousDoc: existingDoc,
      })
    }

    return doc as T
  }

  /**
   * Delete a document
   */
  async delete(collectionName: string, id: string, user?: AccessContext['user']): Promise<void> {
    const collection = this.getCollection(collectionName)

    // Get existing document
    const existingDoc = await this.config.db.findById(collectionName, id)
    if (!existingDoc) {
      throw new Error(`Document with ID "${id}" not found in collection "${collectionName}"`)
    }

    // Check access control
    const accessResult = await this.checkAccess(collection, 'delete', {
      user,
      doc: existingDoc,
    })
    if (accessResult === false) {
      throw new Error(`Access denied for deleting ${collectionName}`)
    }

    // Delete document from database
    await this.config.db.delete(collectionName, id)
  }

  /**
   * Count documents
   */
  async count(
    collectionName: string,
    options: FindOptions = {},
    user?: AccessContext['user'],
  ): Promise<number> {
    const collection = this.getCollection(collectionName)

    // Check access control
    const accessResult = await this.checkAccess(collection, 'read', { user })

    // Merge access control constraints with query
    if (typeof accessResult === 'object') {
      options.where = options.where ? { AND: [options.where, accessResult] } : accessResult
    } else if (accessResult === false) {
      throw new Error(`Access denied for counting ${collectionName}`)
    }

    return await this.config.db.count(collectionName, options)
  }
}

// Singleton CMS instance
let cmsInstance: TinyCMS | null = null

/**
 * Factory function to create a CMS instance
 * Applies plugins via buildConfig before creating the CMS
 */
export async function createCMS(config: Config): Promise<TinyCMS> {
  // Apply plugins to config
  const finalConfig = buildConfig(config)

  const cms = new TinyCMS(finalConfig)
  await cms.init()

  // Store as singleton
  cmsInstance = cms

  return cms
}

/**
 * Get the singleton CMS instance
 * Throws if CMS hasn't been initialized with createCMS yet
 */
export function getCMS(): TinyCMS {
  if (!cmsInstance) {
    throw new Error('CMS instance not initialized. Call createCMS() first to initialize the CMS.')
  }
  return cmsInstance
}
