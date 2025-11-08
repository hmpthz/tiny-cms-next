/**
 * Create better-auth instance for tiny-cms
 * This encapsulates better-auth configuration so external projects don't need to import it
 */

import { betterAuth } from 'better-auth'
import type { AuthOperations, AuthConfig } from './types'
import { AuthWrapper } from './auth-wrapper'

export interface CreateAuthOptions {
  /**
   * Database connection for auth
   * Better-auth needs a Kysely or Drizzle adapter, or a raw Pool
   * For now we accept any and cast appropriately
   */
  database: any

  /**
   * Secret for JWT signing
   */
  secret: string

  /**
   * Auth configuration
   */
  config?: AuthConfig

  /**
   * Trusted origins for CORS
   */
  trustedOrigins?: string[]

  /**
   * Base URL for the application
   */
  baseURL?: string
}

/**
 * Create auth operations from database connection and config
 * This function encapsulates all better-auth setup
 */
export function createAuth(options: CreateAuthOptions): AuthOperations {
  const { database, secret, config, trustedOrigins, baseURL } = options

  // Create better-auth instance with shared database
  const auth = betterAuth({
    database,
    emailAndPassword: {
      enabled: config?.enabled ?? true,
      requireEmailVerification: config?.requireEmailVerification ?? false,
    },
    session: {
      expiresIn: config?.sessionExpiration ?? 60 * 60 * 24 * 7, // Default 7 days
    },
    secret,
    trustedOrigins: trustedOrigins || ['http://localhost:3000'],
    baseURL,
  })

  // Create and return auth wrapper
  return new AuthWrapper(auth, config?.hooks)
}
