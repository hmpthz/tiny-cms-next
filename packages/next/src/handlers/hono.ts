/**
 * Hono handler for Next.js using @hono/node-server/vercel
 * Creates a single handler that delegates all API routes to the CMS Hono app
 */

import { handle } from 'hono/vercel'
import type { TinyCMS, TinyCmsHonoEnv } from '@tiny-cms/core'
import type { Hono } from 'hono'

/**
 * Create a Next.js API route handler from the CMS Hono app
 * This handler can be used in both Pages Router and App Router
 *
 * @example
 * // App Router: app/api/[[...route]]/route.ts
 * import { createHonoHandler } from '@tiny-cms/next'
 * import { getCMS } from '@/lib/cms'
 *
 * const handler = createHonoHandler(getCMS())
 *
 * export const GET = handler
 * export const POST = handler
 * export const PUT = handler
 * export const PATCH = handler
 * export const DELETE = handler
 * export const OPTIONS = handler
 *
 * @example
 * // Pages Router: pages/api/[[...route]].ts
 * import { createHonoHandler } from '@tiny-cms/next'
 * import { getCMS } from '@/lib/cms'
 *
 * export default createHonoHandler(getCMS())
 */
export function createHonoHandler(cms: TinyCMS) {
  const app = cms.app as Hono<TinyCmsHonoEnv>

  // CMS instance is already set in the app via middleware in core package
  // No need to set it again here

  // Return the Vercel handler
  return handle(app)
}
