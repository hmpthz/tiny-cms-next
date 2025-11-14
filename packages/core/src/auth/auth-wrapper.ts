/**
 * Better-auth wrapper for tiny-cms
 * Provides a simplified interface around better-auth operations
 */

import type {
  AuthSession,
  AuthUser,
  AuthOperations,
  AuthHooks,
  AuthResult,
  AuthActionResult,
  AuthRequestHeaders,
} from './types'

// Type for better-auth instance (we don't import to avoid dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BetterAuthInstance = any

export class AuthWrapper implements AuthOperations {
  constructor(
    private betterAuth: BetterAuthInstance,
    private hooks?: AuthHooks,
  ) {}

  private extractCookies(headers?: Headers): string[] | undefined {
    if (!headers) {
      return undefined
    }

    const maybeGetSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
    if (typeof maybeGetSetCookie === 'function') {
      const values = maybeGetSetCookie.call(headers)
      if (values?.length) {
        return values
      }
    }

    const single = headers.get('set-cookie')
    if (single) {
      return [single]
    }

    return undefined
  }

  private async parseResponse(response: any): Promise<{ payload: any; cookies?: string[] }> {
    let payload: any
    try {
      payload = await response.json()
    } catch {
      payload = undefined
    }

    if (!response.ok || payload?.error) {
      throw new Error(payload?.error?.message || 'Authentication request failed')
    }

    return {
      payload,
      cookies: this.extractCookies(response.headers),
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(
    email: string,
    password: string,
    headers?: AuthRequestHeaders,
  ): Promise<AuthResult<AuthSession>> {
    if (this.hooks?.beforeLogin) {
      await this.hooks.beforeLogin({ email })
    }

    const response = await this.betterAuth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers,
      asResponse: true,
      returnHeaders: true,
    })

    const { payload, cookies } = await this.parseResponse(response)

    const session: AuthSession = {
      user: payload.user as AuthUser,
      session: payload.session,
    }

    if (this.hooks?.afterLogin) {
      await this.hooks.afterLogin({ user: session.user, session })
    }

    return { data: session, cookies }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    name: string,
    headers?: AuthRequestHeaders,
  ): Promise<AuthResult<AuthSession>> {
    const response = await this.betterAuth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      headers,
      asResponse: true,
      returnHeaders: true,
    })

    const { payload, cookies } = await this.parseResponse(response)

    const session: AuthSession = {
      user: payload.user as AuthUser,
      session: payload.session,
    }

    if (this.hooks?.afterLogin) {
      await this.hooks.afterLogin({ user: session.user, session })
    }

    return { data: session, cookies }
  }

  /**
   * Sign out
   */
  async signOut(headers?: AuthRequestHeaders): Promise<AuthActionResult> {
    const session = await this.betterAuth.api.getSession({ headers })

    const response = await this.betterAuth.api.signOut({
      headers,
      asResponse: true,
      returnHeaders: true,
    })

    const cookies = this.extractCookies(response.headers)

    if (!response.ok) {
      let message = 'Sign out failed'
      try {
        const payload = await response.json()
        message = payload?.error?.message || message
      } catch {
        // ignore
      }
      throw new Error(message)
    }

    if (this.hooks?.afterLogout && session?.user) {
      await this.hooks.afterLogout({ userId: session.user.id })
    }

    return { success: true, cookies }
  }

  /**
   * Get current session from request headers
   */
  async getSession(headers: AuthRequestHeaders): Promise<AuthSession | null> {
    const session = await this.betterAuth.api.getSession({
      headers,
    })

    if (!session || !session.user) {
      return null
    }

    return {
      user: session.user as AuthUser,
      session: session.session,
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const response = await this.betterAuth.api.verifyEmail({
      body: {
        token,
      },
    })

    if (response.error) {
      throw new Error(response.error.message || 'Email verification failed')
    }
  }

  /**
   * Send password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const response = await this.betterAuth.api.forgetPassword({
      body: {
        email,
      },
    })

    if (response.error) {
      throw new Error(response.error.message || 'Failed to send reset email')
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await this.betterAuth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
    })

    if (response.error) {
      throw new Error(response.error.message || 'Password reset failed')
    }

    // Run afterPasswordReset hook
    if (this.hooks?.afterPasswordReset && response.user) {
      await this.hooks.afterPasswordReset({ user: response.user as AuthUser })
    }
  }
}

/**
 * Create auth wrapper from better-auth instance
 */
export function createAuthWrapper(
  betterAuth: BetterAuthInstance,
  hooks?: AuthHooks,
): AuthOperations {
  return new AuthWrapper(betterAuth, hooks)
}
