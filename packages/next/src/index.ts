/**
 * @tiny-cms/next
 * Next.js integration for tiny-cms
 */

// Hono API handler
export { createHonoHandler } from './handlers/hono'
export { authorize } from './handlers/auth'
export type { RequestContext } from './handlers/auth'
