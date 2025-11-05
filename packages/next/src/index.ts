/**
 * @tiny-cms/next
 * Next.js integration for tiny-cms
 */

// API route handlers
export { createCollectionHandlers, createDocumentHandlers } from './api/route-handlers'
export type { RouteContext } from './api/route-handlers'

// Middleware
export {
  createAuthMiddleware,
  requireAuth,
  getOptionalUser,
  hasRole,
  hasAnyRole,
} from './middleware/auth'
export type { AuthMiddlewareOptions } from './middleware/auth'

// Server action utilities
export { getCurrentUser, requireUser, requireRole, requireAnyRole } from './utils/server-actions'
