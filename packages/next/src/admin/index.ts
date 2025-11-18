/**
 * Admin entrypoints for Next.js integrations.
 *
 * RootAdminPage is a server component that prepares initial data and
 * server actions, while UI and client-side data fetching live in
 * @tiny-cms/admin-ui.
 */

export { RootAdminPage } from './RootAdminPage'
export type { RootAdminPageProps } from './RootAdminPage'

export { parseRoute, buildPath } from './routing'
export type { ViewType, RouteInfo } from './routing'
