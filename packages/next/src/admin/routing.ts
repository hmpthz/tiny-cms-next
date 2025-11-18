/**
 * Admin routing logic
 * Parses URL segments to determine which view to render
 */

export type ViewType = 'dashboard' | 'list' | 'edit' | 'create' | 'signIn' | 'account'

export interface RouteInfo {
  view: ViewType
  collection?: string
  id?: string
}

/**
 * Parse URL segments to determine the view and params.
 */
export function parseRoute(segments: string[]): RouteInfo {
  // Remove 'admin' prefix if present (defensive)
  const cleanSegments = segments[0] === 'admin' ? segments.slice(1) : segments

  // Auth and account routes
  if (cleanSegments[0] === 'sign-in') {
    return { view: 'signIn' }
  }

  if (cleanSegments[0] === 'account') {
    return { view: 'account' }
  }

  // Dashboard: no segments or empty
  if (cleanSegments.length === 0) {
    return { view: 'dashboard' }
  }

  // List view: /admin/posts
  if (cleanSegments.length === 1) {
    return {
      view: 'list',
      collection: cleanSegments[0],
    }
  }

  // Create view: /admin/posts/create
  if (cleanSegments.length === 2 && cleanSegments[1] === 'create') {
    return {
      view: 'create',
      collection: cleanSegments[0],
    }
  }

  // Edit view: /admin/posts/123
  if (cleanSegments.length === 2) {
    return {
      view: 'edit',
      collection: cleanSegments[0],
      id: cleanSegments[1],
    }
  }

  // Default to dashboard for unrecognized routes
  return { view: 'dashboard' }
}

/**
 * Build a URL path for a given route
 */
export function buildPath(route: Partial<RouteInfo>): string {
  const { view, collection, id } = route

  if (!view || view === 'dashboard') {
    return '/admin'
  }

  if (view === 'list' && collection) {
    return `/admin/${collection}`
  }

  if (view === 'create' && collection) {
    return `/admin/${collection}/create`
  }

  if (view === 'edit' && collection && id) {
    return `/admin/${collection}/${id}`
  }

  if (view === 'signIn') {
    return '/admin/sign-in'
  }

  if (view === 'account') {
    return '/admin/account'
  }

  return '/admin'
}

