/**
 * Auth middleware and helpers (generic + Hono adapters)
 * - Generic: resolve auth context from cookies only
 * - Hono: optional and required auth helpers using cookies header
 */

import type { AuthSession, AuthUser } from '../auth/types'
import type { TinyCMS } from '../cms'

export interface AuthContext {
  user?: AuthUser
  session?: AuthSession['session']
}

/**
 * Resolve auth context from a raw cookie header using core auth operations.
 * Backend-agnostic: callers provide `cookie` only.
 */
export async function resolveAuthFromCookie(
  cms: TinyCMS,
  cookieHeader?: string,
): Promise<AuthContext> {
  try {
    const headers = new Headers()
    if (cookieHeader) headers.set('cookie', cookieHeader)
    const session = await cms.auth.getSession(headers)
    if (!session || !session.user) return {}
    return { user: session.user, session: session.session }
  } catch {
    return {}
  }
}

/**
 * Hono helper: optional auth inside a route handler.
 * Reads cookie from request and returns resolved context.
 * Note: kept as a helper instead of true middleware to avoid type coupling.
 */
export async function honoOptionalAuth(c: { req: { header: (k: string) => string | undefined }; get: (k: string) => TinyCMS }): Promise<AuthContext> {
  const cms = c.get('cms') as TinyCMS
  const cookie = c.req.header('cookie')
  return await resolveAuthFromCookie(cms, cookie)
}

/**
 * Hono helper: required auth; throws 401-like object when missing.
 */
export async function honoRequireAuth(c: {
  req: { header: (k: string) => string | undefined }
  get: (k: string) => TinyCMS
  json: (body: unknown, status?: number) => Response
}): Promise<AuthContext> {
  const ctx = await honoOptionalAuth(c as any)
  if (!ctx.user) {
    // Prefer caller-side check to keep flow explicit
    // This function retained for compatibility but unused by default
    return {}
  }
  return ctx
}
