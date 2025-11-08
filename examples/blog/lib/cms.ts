/**
 * Tiny-CMS configuration for blog example
 * Demonstrates: Collections, Fields, Access Control, Hooks, Auth Integration, Plugins
 */

import { createCMS, createAuth, defineConfig } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db-postgres'
import { storagePlugin, createSupabaseAdapter } from '@tiny-cms/storage'
import { searchPlugin } from '@tiny-cms/search'

// Create database adapter (shared between CMS and auth)
const dbAdapter = postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  },
})

// Create auth operations using better-auth (now encapsulated in core)
const authOperations = createAuth({
  database: dbAdapter.getPool(), // Share database connection
  secret: process.env.AUTH_SECRET!,
  trustedOrigins: [process.env.NEXTAUTH_URL || 'http://localhost:3000'],
  baseURL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  config: {
    enabled: true,
    requireEmailVerification: false,
    roles: ['admin', 'author', 'user'],
    defaultRole: 'user',
  },
})

// Define CMS configuration with plugins
export const cmsConfig = defineConfig({
  // Database adapter
  db: dbAdapter,

  // Authentication
  auth: {
    operations: authOperations,
    config: {
      enabled: true,
      requireEmailVerification: false,
      roles: ['admin', 'author', 'user'],
      defaultRole: 'user',
    },
  },

  // Plugins
  plugins: [
    // Storage plugin for file uploads
    storagePlugin({
      adapter: createSupabaseAdapter({
        url: process.env.SUPABASE_URL!,
        key: process.env.SUPABASE_SERVICE_KEY!,
        bucket: process.env.SUPABASE_BUCKET || 'tiny-cms',
        isPublic: true,
      }),
    }),

    // Search plugin for full-text search
    searchPlugin({
      collections: [
        {
          name: 'posts',
          searchFields: ['title', 'excerpt', 'content'],
          language: 'english',
        },
        {
          name: 'categories',
          searchFields: ['name', 'description'],
          language: 'english',
        },
      ],
    }),
  ],

  // Collections
  collections: [
    // Media collection for file uploads
    {
      name: 'media',
      timestamps: true,
      fields: [
        { name: 'filename', type: 'text', required: true },
        { name: 'mimeType', type: 'text', required: true },
        { name: 'size', type: 'number', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'alt', type: 'text' },
        { name: 'caption', type: 'text' },
        { name: 'width', type: 'number' },
        { name: 'height', type: 'number' },
      ],
      access: {
        read: () => true, // Public read access
        create: ({ user }) => ['admin', 'author'].includes(user?.role || ''),
        update: ({ user }) => ['admin', 'author'].includes(user?.role || ''),
        delete: ({ user }) => user?.role === 'admin',
      },
    },

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
        { name: 'featuredImage', type: 'relation', to: 'media' },
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

// Initialize CMS instance (exported as promise)
// Use getCMS() to get the singleton instance after initialization
export const cms = createCMS(cmsConfig)
