/**
 * @tiny-cms/next
 * Next.js integration for tiny-cms
 */

// Hono API handler
export { createHonoHandler } from './handlers/hono'
export { authorize } from './handlers/auth'
export type { RequestContext } from './handlers/auth'

// Admin UI components (server components)
export {
  RootPage,
  RootLayout,
  Dashboard,
  ListView,
  EditView,
  CreateView,
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
  ViewType,
  RouteInfo,
} from './admin'
