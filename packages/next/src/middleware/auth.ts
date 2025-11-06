/**
 * Auth middleware helpers for Next.js
 */

import { NextRequest, NextResponse } from 'next/server'
import type { TinyCMS } from '@tiny-cms/core'

/**
 * Create auth middleware
 */
export function createAuthMiddleware(cms: TinyCMS, options?: AuthMiddlewareOptions) {
  return async function authMiddleware(request: NextRequest) {
    const { protectedPaths = [], publicPaths = [], redirectTo = '/sign-in' } = options || {}

    const pathname = request.nextUrl.pathname

    // Check if path is public
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))
    if (isPublicPath) {
      return NextResponse.next()
    }

    // Check if path is protected
    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))
    if (!isProtectedPath) {
      return NextResponse.next()
    }

    // Check session
    try {
      const session = await cms.auth.getSession(request.headers)

      if (!session) {
        // Redirect to sign in
        const url = request.nextUrl.clone()
        url.pathname = redirectTo
        url.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(url)
      }

      // User is authenticated
      return NextResponse.next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      const url = request.nextUrl.clone()
      url.pathname = redirectTo
      return NextResponse.redirect(url)
    }
  }
}

export interface AuthMiddlewareOptions {
  /**
   * Paths that require authentication
   * Example: ['/admin', '/dashboard']
   */
  protectedPaths?: string[]

  /**
   * Paths that are always accessible
   * Example: ['/sign-in', '/sign-up', '/api/auth']
   */
  publicPaths?: string[]

  /**
   * Redirect path for unauthenticated users
   * Default: '/sign-in'
   */
  redirectTo?: string
}

/**
 * Require authentication for a server action or route handler
 */
export async function requireAuth(cms: TinyCMS, request: NextRequest) {
  const session = await cms.auth.getSession(request.headers)

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session.user
}

/**
 * Get optional user from request
 */
export async function getOptionalUser(cms: TinyCMS, request: NextRequest) {
  try {
    const session = await cms.auth.getSession(request.headers)
    return session?.user
  } catch {
    return null
  }
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: { role?: string } | undefined | null, role: string): boolean {
  return user?.role === role
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: { role?: string } | undefined | null, roles: string[]): boolean {
  return roles.some((role) => hasRole(user, role))
}
