import type { Hono } from 'hono'
import type { TinyCmsHonoEnv, TinyCMS } from '../cms'
import {
  healthHandler,
  findHandler,
  createHandler,
  countHandler,
  findByIdHandler,
  updateHandler,
  deleteHandler,
} from './operations.controller'

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
