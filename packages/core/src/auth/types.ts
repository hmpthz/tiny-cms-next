/**
 * Auth types for tiny-cms
 * Integrates with better-auth for authentication
 */

// Better-auth session types
export interface AuthSession {
  user: AuthUser
  session: {
    id: string
    userId: string
    expiresAt: Date
    ipAddress?: string
    userAgent?: string
  }
}

export interface AuthUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
  // Additional fields for tiny-cms
  role?: string
  [key: string]: unknown
}

// Auth operations
export type AuthRequestHeaders = Headers | Record<string, string> | Array<[string, string]> | undefined

export interface AuthResult<T> {
  data: T
  cookies?: string[]
}

export interface AuthActionResult {
  success: boolean
  cookies?: string[]
}

export interface AuthOperations {
  /**
   * Sign in with email and password
   */
  signIn(email: string, password: string, headers?: AuthRequestHeaders): Promise<AuthResult<AuthSession>>

  /**
   * Sign up with email and password
   */
  signUp(
    email: string,
    password: string,
    name: string,
    headers?: AuthRequestHeaders,
  ): Promise<AuthResult<AuthSession>>

  /**
   * Sign out
   */
  signOut(headers?: AuthRequestHeaders): Promise<AuthActionResult>

  /**
   * Get current session from request
   */
  getSession(headers: AuthRequestHeaders): Promise<AuthSession | null>

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Promise<void>

  /**
   * Send password reset email
   */
  forgotPassword(email: string): Promise<void>

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<void>
}

// Auth hooks
export interface AuthHooks {
  /**
   * Runs before login
   */
  beforeLogin?: (args: { email: string }) => Promise<void> | void

  /**
   * Runs after successful login
   */
  afterLogin?: (args: { user: AuthUser; session: AuthSession }) => Promise<void> | void

  /**
   * Runs after logout
   */
  afterLogout?: (args: { userId: string }) => Promise<void> | void

  /**
   * Runs after password reset
   */
  afterPasswordReset?: (args: { user: AuthUser }) => Promise<void> | void
}

// Auth config
export interface AuthConfig {
  /**
   * Enable email/password authentication
   */
  enabled: boolean

  /**
   * Require email verification before login
   */
  requireEmailVerification?: boolean

  /**
   * Session expiration (in seconds)
   * Default: 7 days
   */
  sessionExpiration?: number

  /**
   * Auth-specific hooks
   */
  hooks?: AuthHooks

  /**
   * Allowed roles for users
   */
  roles?: string[]

  /**
   * Default role for new users
   */
  defaultRole?: string
}
