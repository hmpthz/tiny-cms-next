/**
 * Next.js server-side auth helpers (cookies-only)
 */

import { cookies } from 'next/headers'
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

export async function getServerAuth(cms: TinyCMS) {
  const cookie = (await cookies()).toString()
  const headersObj = new Headers()
  if (cookie) headersObj.set('cookie', cookie)
  const session = await cms.auth.getSession(headersObj)
  if (!session || !session.user) return null
  return { user: session.user, session: session.session }
}

export async function requireServerAuth(cms: TinyCMS): Promise<RequestContext> {
  const auth = await getServerAuth(cms)
  if (!auth) throw new Error('Unauthorized: No active session')
  return { user: auth.user, cms }
}

/** Create a server action that requires auth */
export function withServerAuth<T extends unknown[], R = unknown>(
  cms: TinyCMS,
  handler: (ctx: RequestContext, ...args: T) => Promise<R> | R,
) {
  return async (...args: T) => {
    'use server'
    const ctx = await requireServerAuth(cms)
    return handler(ctx, ...args)
  }
}
