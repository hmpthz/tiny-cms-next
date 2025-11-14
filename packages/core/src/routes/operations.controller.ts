import type { Context } from 'hono'
import type { TinyCmsHonoEnv } from '../cms'
import type { FindOptions } from '../types'
import { honoOptionalAuth } from './auth.middleware'

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
  const { user } = await honoOptionalAuth(c)

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
    const result = await cms.find(collection, options, user)
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
    const ctx = await honoOptionalAuth(c)
    if (!ctx.user) return c.json({ error: 'Unauthorized' }, 401)
    const doc = await cms.create(collection, data, ctx.user)
    return c.json(doc, 201)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
}

export async function countHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  const collection = c.req.param('collection')
  const query = c.req.query()
  const { user } = await honoOptionalAuth(c)

  const options: FindOptions = {}
  if (query.where) {
    try {
      options.where = JSON.parse(query.where)
    } catch {
      return c.json({ error: 'Invalid where clause' }, 400)
    }
  }

  try {
    const count = await cms.count(collection, options, user)
    return c.json({ count })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
}

export async function findByIdHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  const collection = c.req.param('collection')
  const id = c.req.param('id')
  const { user } = await honoOptionalAuth(c)

  try {
    const doc = await cms.findById(collection, id, user)
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
    const ctx = await honoOptionalAuth(c)
    if (!ctx.user) return c.json({ error: 'Unauthorized' }, 401)
    const doc = await cms.update(collection, id, data, ctx.user)
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
    const ctx = await honoOptionalAuth(c)
    if (!ctx.user) return c.json({ error: 'Unauthorized' }, 401)
    await cms.delete(collection, id, ctx.user)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
}
