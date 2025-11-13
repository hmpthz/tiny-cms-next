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
export async function authorize(cms: TinyCMS): Promise<RequestContext> {
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
