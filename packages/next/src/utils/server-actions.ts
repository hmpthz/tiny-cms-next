/**
 * Server action utilities for Next.js
 */

import { headers } from 'next/headers'
import type { TinyCMS, AuthUser } from '@tiny-cms/core'

/**
 * Get current user in server action
 */
export async function getCurrentUser(cms: TinyCMS): Promise<AuthUser | null> {
  try {
    const headersList = await headers()
    const session = await cms.auth.getSession(headersList)
    return session?.user || null
  } catch {
    return null
  }
}

/**
 * Require user in server action (throws if not authenticated)
 */
export async function requireUser(cms: TinyCMS): Promise<AuthUser> {
  const user = await getCurrentUser(cms)

  if (!user) {
    throw new Error('Unauthorized: Authentication required')
  }

  return user
}

/**
 * Require specific role in server action
 */
export async function requireRole(cms: TinyCMS, role: string): Promise<AuthUser> {
  const user = await requireUser(cms)

  if (user.role !== role) {
    throw new Error(`Forbidden: ${role} role required`)
  }

  return user
}

/**
 * Require any of the specified roles
 */
export async function requireAnyRole(cms: TinyCMS, roles: string[]): Promise<AuthUser> {
  const user = await requireUser(cms)

  if (!roles.includes(user.role || '')) {
    throw new Error(`Forbidden: One of ${roles.join(', ')} roles required`)
  }

  return user
}
