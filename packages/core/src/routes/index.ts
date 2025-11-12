/**
 * API route handlers and registration
 */

import type { Hono } from 'hono'
import type { Context } from 'hono'
import type { TinyCmsHonoEnv, TinyCMS } from '../cms'
import type { FindOptions } from '../types'

// ============================================================================
// Health Check
// ============================================================================

export function healthHandler(c: Context<TinyCmsHonoEnv>) {
  return c.json({ status: 'ok', version: '0.1.0' })
}

// ============================================================================
// Collection Handlers
// ============================================================================

export async function findHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
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
}

export async function createHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  const collection = c.req.param('collection')
  const data = await c.req.json()

  try {
    // TODO: Get user from auth middleware
    const doc = await cms.create(collection, data)
    return c.json(doc, 201)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
}

export async function countHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
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
}

export async function findByIdHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
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
}

export async function updateHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
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
}

export async function deleteHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  const collection = c.req.param('collection')
  const id = c.req.param('id')

  try {
    // TODO: Get user from auth middleware
    await cms.delete(collection, id)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register all API routes with the Hono app
 */
export function registerRoutes(app: Hono<TinyCmsHonoEnv>, cms: TinyCMS) {
  // Health check
  app.get('/health', healthHandler)

  // Collection routes
  app.get('/collections/:collection', findHandler)
  app.post('/collections/:collection', createHandler)
  app.get('/collections/:collection/count', countHandler)
  app.get('/collections/:collection/:id', findByIdHandler)
  app.patch('/collections/:collection/:id', updateHandler)
  app.delete('/collections/:collection/:id', deleteHandler)

  // Auth routes (if configured)
  if (cms.getConfig().auth) {
    // TODO: Setup auth routes using better-auth
    // These will be delegated to the auth operations
  }
}
