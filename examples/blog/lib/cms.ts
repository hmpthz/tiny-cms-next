/**
 * Tiny-CMS configuration for blog example
 * Demonstrates: Collections, Fields, Access Control, Hooks, Auth Integration
 */

import { createCMS, defineConfig, createAuthWrapper } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db'
import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
})

// Create better-auth instance
export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  secret: process.env.AUTH_SECRET!,
  trustedOrigins: [process.env.NEXTAUTH_URL || 'http://localhost:3000'],
})

// Define CMS configuration
export const cmsConfig = defineConfig({
  // Database adapter
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL!,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    },
  }),

  // Authentication
  auth: {
    operations: createAuthWrapper(auth),
    config: {
      enabled: true,
      requireEmailVerification: false,
      roles: ['admin', 'author', 'user'],
      defaultRole: 'user',
    },
  },

  // Collections
  collections: [
    // Users collection
    {
      name: 'users',
      timestamps: true,
      fields: [
        { name: 'email', type: 'email', required: true, unique: true },
        { name: 'name', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          options: ['admin', 'author', 'user'],
          defaultValue: 'user',
        },
      ],
      access: {
        read: () => true, // Anyone can read users
        create: ({ user }) => !!user, // Only authenticated users can create
        update: ({ user, doc }) => user?.id === doc?.id || user?.role === 'admin',
        delete: ({ user }) => user?.role === 'admin',
      },
    },

    // Categories collection
    {
      name: 'categories',
      timestamps: true,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'description', type: 'text' },
      ],
      access: {
        read: () => true, // Public
        create: ({ user }) => user?.role === 'admin',
        update: ({ user }) => user?.role === 'admin',
        delete: ({ user }) => user?.role === 'admin',
      },
      hooks: {
        beforeChange: async ({ data }) => {
          // Auto-generate slug if not provided
          if (!data.slug && data.name) {
            data.slug = (data.name as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
          }
          return data
        },
      },
    },

    // Posts collection
    {
      name: 'posts',
      timestamps: true,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'excerpt', type: 'text' },
        { name: 'content', type: 'richtext', required: true },
        { name: 'author', type: 'relation', to: 'users', required: true },
        { name: 'category', type: 'relation', to: 'categories' },
        { name: 'tags', type: 'select', options: [], multiple: true },
        { name: 'published', type: 'checkbox', defaultValue: false },
        { name: 'publishedAt', type: 'date' },
      ],
      access: {
        // Anyone can read published posts
        read: ({ user }) => {
          if (user) return true // Authenticated users see all
          return { published: true } // Public sees only published
        },
        // Authors and admins can create
        create: ({ user }) => ['admin', 'author'].includes(user?.role || ''),
        // Authors can update their own, admins can update any
        update: ({ user, doc }) => {
          if (user?.role === 'admin') return true
          return user?.id === doc?.author
        },
        // Only admins can delete
        delete: ({ user }) => user?.role === 'admin',
      },
      hooks: {
        beforeChange: async ({ data, context }) => {
          // Auto-generate slug if not provided
          if (!data.slug && data.title) {
            data.slug = (data.title as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
          }

          // Set publishedAt when publishing
          if (data.published && !data.publishedAt) {
            data.publishedAt = new Date()
          }

          // Auto-set author on create
          if (context.operation === 'create' && context.user && !data.author) {
            data.author = context.user.id
          }

          return data
        },
        afterChange: async ({ doc }) => {
          // Could trigger revalidation, send notifications, etc.
          console.log(`Post ${doc.id} saved:`, doc.title)
        },
      },
    },
  ],
})

// Create and export CMS instance
let cmsInstance: Awaited<ReturnType<typeof createCMS>> | null = null

export async function getCMS() {
  if (!cmsInstance) {
    cmsInstance = await createCMS(cmsConfig)
  }
  return cmsInstance
}
