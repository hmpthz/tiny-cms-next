/**
 * Request initialization utility for admin routes
 * Server-side only - initializes auth and CMS context
 */

import { headers } from 'next/headers'
import type { TinyCMS } from '@tiny-cms/core'

export interface RequestContext {
  user: {
    id: string
    email?: string
    role?: string
    [key: string]: unknown
  }
  cms: TinyCMS
}

/**
 * Initialize request context for admin routes
 * This should be called in Server Components to get the authenticated user
 *
 * @throws Error if user is not authenticated
 */
export async function initReq(cms: TinyCMS): Promise<RequestContext> {
  const headersList = await headers()

  // Get session from headers
  const session = await cms.auth.getSession(headersList)

  if (!session || !session.user) {
    throw new Error('Unauthorized: No active session')
  }

  return {
    user: session.user,
    cms,
  }
}

/**
 * Get optional user context (doesn't throw if not authenticated)
 */
export async function getOptionalContext(cms: TinyCMS): Promise<RequestContext | null> {
  try {
    return await initReq(cms)
  } catch {
    return null
  }
}

/**
 * Require specific role for access
 */
export function requireRole(context: RequestContext, role: string | string[]): void {
  const roles = Array.isArray(role) ? role : [role]
  const userRole = context.user.role

  if (!userRole || !roles.includes(userRole)) {
    throw new Error(`Forbidden: Requires role: ${roles.join(' or ')}`)
  }
}

/**
 * Check if user has role (doesn't throw)
 */
export function hasRole(context: RequestContext, role: string | string[]): boolean {
  const roles = Array.isArray(role) ? role : [role]
  const userRole = context.user.role
  return userRole ? roles.includes(userRole) : false
}
