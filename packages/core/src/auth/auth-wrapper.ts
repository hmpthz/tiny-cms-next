/**
 * Better-auth wrapper for tiny-cms
 * Provides a simplified interface around better-auth operations
 */

import type { AuthSession, AuthUser, AuthOperations, AuthHooks } from './types'

// Type for better-auth instance (we don't import to avoid dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BetterAuthInstance = any

export class AuthWrapper implements AuthOperations {
  constructor(
    private betterAuth: BetterAuthInstance,
    private hooks?: AuthHooks,
  ) {}

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthSession> {
    // Run beforeLogin hook
    if (this.hooks?.beforeLogin) {
      await this.hooks.beforeLogin({ email })
    }

    // Call better-auth signIn
    const response = await this.betterAuth.api.signInEmail({
      body: {
        email,
        password,
      },
    })

    if (!response || response.error) {
      throw new Error(response?.error?.message || 'Sign in failed')
    }

    const session: AuthSession = {
      user: response.user as AuthUser,
      session: response.session,
    }

    // Run afterLogin hook
    if (this.hooks?.afterLogin) {
      await this.hooks.afterLogin({ user: session.user, session })
    }

    return session
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, name: string): Promise<AuthSession> {
    const response = await this.betterAuth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    })

    if (!response || response.error) {
      throw new Error(response?.error?.message || 'Sign up failed')
    }

    const session: AuthSession = {
      user: response.user as AuthUser,
      session: response.session,
    }

    // Run afterLogin hook for new registrations too
    if (this.hooks?.afterLogin) {
      await this.hooks.afterLogin({ user: session.user, session })
    }

    return session
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const session = await this.betterAuth.api.getSession()

    await this.betterAuth.api.signOut()

    // Run afterLogout hook
    if (this.hooks?.afterLogout && session?.user) {
      await this.hooks.afterLogout({ userId: session.user.id })
    }
  }

  /**
   * Get current session from request headers
   */
  async getSession(headers: Headers): Promise<AuthSession | null> {
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
