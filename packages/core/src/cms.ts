/**
 * Main TinyCMS class
 * Provides CRUD operations with hooks, validation, and access control
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
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

// Define context variables for Hono app
export type CMSVariables = {
  cms: TinyCMS
}

export class TinyCMS {
  private config: Config
  private collections: Map<string, Collection>
  private _app: Hono<{ Variables: CMSVariables }>
  private isInitialized: boolean = false

  constructor(config: Config, app?: Hono<{ Variables: CMSVariables }>) {
    this.config = config
    this.collections = new Map()
    this._app = app || new Hono<{ Variables: CMSVariables }>()

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
   * Get Hono app instance for route handling
   */
  get app(): Hono<{ Variables: CMSVariables }> {
    return this._app
  }

  /**
   * Initialize the CMS (connect to database)
   * Called lazily on first request if not already initialized
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    await this.config.db.connect()
    this.isInitialized = true
  }

  /**
   * Ensure the CMS is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init()
    }
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
    await this.ensureInitialized()
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
    await this.ensureInitialized()
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
    await this.ensureInitialized()
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
    await this.ensureInitialized()
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
    await this.ensureInitialized()
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
    await this.ensureInitialized()
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
 * Factory function to create a CMS instance (synchronous)
 * Applies plugins via buildConfig before creating the CMS
 * Database initialization happens lazily on first request
 */
export function createCMS(config: Config): TinyCMS {
  // Create Hono app with proper Variables typing
  const app = new Hono<{ Variables: CMSVariables }>()

  // Apply plugins to config and register routes
  const finalConfig = buildConfig(config, app)

  const cms = new TinyCMS(finalConfig, app)

  // Setup middleware and routes
  setupHonoApp(app, cms)

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

/**
 * Setup Hono app with middleware and routes
 */
function setupHonoApp(app: Hono<{ Variables: CMSVariables }>, cms: TinyCMS) {
  // Add CORS middleware
  app.use('*', cors())

  // Add CMS instance to context variables
  app.use('*', async (c, next) => {
    c.set('cms', cms)
    await next()
  })

  // Add lazy initialization middleware
  app.use('*', async (_c, next) => {
    await cms.init()
    await next()
  })

  // Setup API routes
  setupAPIRoutes(app, cms)
}

/**
 * Setup API routes for collections
 */
function setupAPIRoutes(app: Hono<{ Variables: CMSVariables }>, cms: TinyCMS) {
  const basePath = cms.getConfig().baseApiPath || '/api'

  // Health check
  app.get(`${basePath}/health`, (c) => {
    return c.json({ status: 'ok', version: '0.1.0' })
  })

  // Collection routes
  app.get(`${basePath}/collections/:collection`, async (c) => {
    const collection = c.req.param('collection')
    const query = c.req.query()

    // Parse query parameters
    const options: FindOptions = {
      limit: query.limit ? parseInt(query.limit) : 10,
      offset: query.offset ? parseInt(query.offset) : 0,
    }

    if (query.where) {
      try {
        options.where = JSON.parse(query.where)
      } catch {
        return c.json({ error: 'Invalid where clause' }, 400)
      }
    }

    if (query.orderBy) {
      try {
        options.orderBy = JSON.parse(query.orderBy)
      } catch {
        return c.json({ error: 'Invalid orderBy clause' }, 400)
      }
    }

    try {
      // TODO: Get user from auth middleware
      const result = await cms.find(collection, options)
      return c.json(result)
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  app.post(`${basePath}/collections/:collection`, async (c) => {
    const collection = c.req.param('collection')
    const data = await c.req.json()

    try {
      // TODO: Get user from auth middleware
      const doc = await cms.create(collection, data)
      return c.json(doc, 201)
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  app.get(`${basePath}/collections/:collection/count`, async (c) => {
    const collection = c.req.param('collection')
    const query = c.req.query()

    const options: FindOptions = {}
    if (query.where) {
      try {
        options.where = JSON.parse(query.where)
      } catch {
        return c.json({ error: 'Invalid where clause' }, 400)
      }
    }

    try {
      // TODO: Get user from auth middleware
      const count = await cms.count(collection, options)
      return c.json({ count })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  app.get(`${basePath}/collections/:collection/:id`, async (c) => {
    const collection = c.req.param('collection')
    const id = c.req.param('id')

    try {
      // TODO: Get user from auth middleware
      const doc = await cms.findById(collection, id)
      if (!doc) {
        return c.json({ error: 'Document not found' }, 404)
      }
      return c.json(doc)
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  app.patch(`${basePath}/collections/:collection/:id`, async (c) => {
    const collection = c.req.param('collection')
    const id = c.req.param('id')
    const data = await c.req.json()

    try {
      // TODO: Get user from auth middleware
      const doc = await cms.update(collection, id, data)
      return c.json(doc)
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  app.delete(`${basePath}/collections/:collection/:id`, async (c) => {
    const collection = c.req.param('collection')
    const id = c.req.param('id')

    try {
      // TODO: Get user from auth middleware
      await cms.delete(collection, id)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  // Auth routes (if configured)
  if (cms.getConfig().auth) {
    // TODO: Setup auth routes using better-auth
    // These will be delegated to the auth operations
  }
}
