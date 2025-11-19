import type { Context } from 'hono'
import type { TinyCmsHonoEnv } from '../cms'
import { honoOptionalAuth } from './auth.middleware'

function setAuthCookies(c: Context<TinyCmsHonoEnv>, cookies?: string[]) {
  if (!cookies?.length) {
    return
  }

  for (const cookie of cookies) {
    c.header('Set-Cookie', cookie, { append: true })
  }
}

export async function signInHandler(c: Context<TinyCmsHonoEnv>) {
  try {
    const cms = c.get('cms')
    const body = await c.req.json<{ email?: string; password?: string }>()
    const { email, password } = body || {}

    if (!email || !password) {
      return c.json({ error: 'Missing email or password' }, 400)
    }

    const result = await cms.auth.signIn(email, password, c.req.raw.headers)
    setAuthCookies(c, result.cookies)
    return c.json({ user: result.data.user, session: result.data.session })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Sign in failed' }, 400)
  }
}

export async function signUpHandler(c: Context<TinyCmsHonoEnv>) {
  try {
    const cms = c.get('cms')
    const body = await c.req.json<{ email?: string; password?: string; name?: string }>()
    const { email, password, name } = body || {}

    if (!email || !password || !name) {
      return c.json({ error: 'Missing email, password or name' }, 400)
    }

    const result = await cms.auth.signUp(email, password, name, c.req.raw.headers)
    setAuthCookies(c, result.cookies)
    return c.json({ user: result.data.user, session: result.data.session })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Sign up failed' }, 400)
  }
}

export async function signOutHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  try {
    // Ensure there is a session (optional)
    await honoOptionalAuth(c)
    const result = await cms.auth.signOut(c.req.raw.headers)
    setAuthCookies(c, result.cookies)
    return c.json({ success: result.success })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Sign out failed' }, 400)
  }
}

export async function sessionHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  try {
    const session = await cms.auth.getSession(c.req.raw.headers)
    if (!session) return c.json({ user: null, session: null }, 200)
    return c.json({ user: session.user, session: session.session })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Failed to get session' }, 400)
  }
}

export async function forgotPasswordHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  try {
    const body = await c.req.json<{ email?: string }>()
    if (!body?.email) return c.json({ error: 'Missing email' }, 400)
    await cms.auth.forgotPassword(body.email)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Failed to send reset email' }, 400)
  }
}

export async function resetPasswordHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  try {
    const body = await c.req.json<{ token?: string; newPassword?: string }>()
    if (!body?.token || !body?.newPassword) return c.json({ error: 'Missing token or newPassword' }, 400)
    await cms.auth.resetPassword(body.token, body.newPassword)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Password reset failed' }, 400)
  }
}

export async function verifyEmailHandler(c: Context<TinyCmsHonoEnv>) {
  const cms = c.get('cms')
  try {
    const body = await c.req.json<{ token?: string }>()
    if (!body?.token) return c.json({ error: 'Missing token' }, 400)
    await cms.auth.verifyEmail(body.token)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Email verification failed' }, 400)
  }
}

/**
 * Register auth routes under /auth/*
 */
export function registerAuthRoutes(app: import('hono').Hono<TinyCmsHonoEnv>) {
  app.post('/auth/sign-in', signInHandler)
  app.post('/auth/sign-up', signUpHandler)
  app.post('/auth/sign-out', signOutHandler)
  // Alias for backward-compat if needed
  app.post('/auth/signout', signOutHandler)
  app.get('/auth/signout', signOutHandler)

  app.get('/auth/session', sessionHandler)

  // Optional flows
  app.post('/auth/password/forgot', forgotPasswordHandler)
  app.post('/auth/password/reset', resetPasswordHandler)
  app.post('/auth/email/verify', verifyEmailHandler)
}
