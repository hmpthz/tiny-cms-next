/**
 * @tiny-cms/next
 * Next.js integration for tiny-cms
 */

// API route handlers (legacy)
export { createCollectionHandlers, createDocumentHandlers } from './api/route-handlers'
export type { RouteContext } from './api/route-handlers'

// Hono API handler (recommended)
export { createHonoHandler, createCustomHonoHandler } from './api/hono-handler'

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

// Admin UI components
export {
  RootPage,
  RootLayout,
  Dashboard,
  ListView,
  EditView,
  CreateView,
  initReq,
  getOptionalContext,
  parseRoute,
  buildPath,
} from './admin'
export type {
  RootPageProps,
  RootLayoutProps,
  DashboardProps,
  ListViewProps,
  EditViewProps,
  CreateViewProps,
  RequestContext,
  ViewType,
  RouteInfo,
} from './admin'
