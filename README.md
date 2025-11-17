# Tiny-CMS

**A simplified, production-ready headless CMS built with Next.js, TypeScript, and PostgreSQL.**

Tiny-CMS is inspired by Payload CMS but drastically simplified - while maintaining essential CMS functionality.

## Features

- ✅ **Type-Safe**: Full TypeScript with strict mode
- ✅ **Next.js Native**: Built for Next.js 14/15 App Router
- ✅ **PostgreSQL Only**: Using Kysely ORM for type-safe queries
- ✅ **Better-Auth Integration**: Modern authentication with email/password
- ✅ **8 Field Types**: Text, Number, Email, Select, Checkbox, Date, Relation, RichText
- ✅ **Access Control**: Function-based permissions at collection & operation level
- ✅ **Hooks**: beforeChange, afterChange, beforeRead for customization
- ✅ **Auto Validation**: Zod-based runtime validation
- ✅ **Simple API**: 6 CRUD operations (create, find, findById, update, delete, count)

## Architecture

```
tiny-cms/
├── packages/
│   ├── core/           # Core CMS Implementations and interfaces
│   ├── db-postgres/    # Kysely PostgreSQL adapter
│   ├── next/           # Next.js integration
│   ├── plugin-storage/ # Storage plugin adapter
│   └── ui/             # Minimal UI components
└── examples/
    └── blog/           # Full blog example
```

## Quick Start

### 1. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/tiny-cms-next
cd tiny-cms-next

# Install dependencies
pnpm install

# Build packages
pnpm run build
```

### 2. Set Up Example Blog

```bash
cd examples/blog

# Copy environment variables
cp .env.example .env

# Edit .env with your PostgreSQL connection string
# DATABASE_URL=postgresql://user:password@localhost:5432/tiny_cms_blog
# AUTH_SECRET=generate-a-secure-random-string

# Create database schema
pnpm db:push

# Run development server
pnpm dev
```

### 3. Access the Application

- Blog: http://localhost:3000
- API: http://localhost:3000/api/collections/posts

## Core Concepts

### Collections

Collections are like database tables. Define them with fields, access control, and hooks:

```typescript
import { defineConfig } from '@tiny-cms/core'

export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext', required: true },
        { name: 'author', type: 'relation', to: 'users' },
        { name: 'published', type: 'checkbox', defaultValue: false },
      ],
      access: {
        read: () => true,
        create: ({ user }) => !!user,
      },
      hooks: {
        beforeChange: async ({ data }) => {
          data.slug = slugify(data.title)
          return data
        },
      },
    },
  ],
})
```

### Authentication

Tiny-CMS uses Better-Auth for authentication:

```typescript
import { betterAuth } from 'better-auth'
import { createAuthWrapper } from '@tiny-cms/core'

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
})

const config = defineConfig({
  auth: {
    operations: createAuthWrapper(auth),
    config: {
      enabled: true,
      roles: ['admin', 'user'],
    },
  },
})
```

### API Routes

Catch-all API route that proxies to the Hono app:

```typescript
// app/api/[[...route]]/route.ts
import { createHonoHandler } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'

const handler = createHonoHandler(getCMS())
export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
```

### Access Control

Function-based access control with granular permissions:

```typescript
access: {
  read: ({ user }) => {
    if (user) return true // Authenticated users see all
    return { published: true } // Public sees only published
  },
  update: ({ user, doc }) => {
    if (user?.role === 'admin') return true
    return user?.id === doc?.author // Authors can edit their own
  },
}
```

### Hooks

Customize behavior at key points:

```typescript
hooks: {
  beforeChange: async ({ data, context }) => {
    // Transform data before save
    if (!data.slug) {
      data.slug = slugify(data.title)
    }
    return data
  },
  afterChange: async ({ doc }) => {
    // Trigger side effects after save
    await revalidatePath(`/posts/${doc.slug}`)
  },
}
```

## Packages

### @tiny-cms/core

Core CMS logic with collections, CRUD, validation, hooks, and auth integration.

**Key Exports:**

- `TinyCMS` - Main CMS class
- `defineConfig()` - Config helper
- `createAuth()` - Better-auth integration wrapper

[Read full documentation →](./packages/core/README.md)

### @tiny-cms/db-postgres

PostgreSQL database adapter using Kysely ORM.

**Key Exports:**

- `postgresAdapter()` - Kysely adapter factory
- `SchemaBuilder` - Schema generation from collections

[Read full documentation →](./packages/db-postgres/README.md)

### @tiny-cms/next

Next.js integration with the core Hono app and cookie-only auth helpers.

**Key Exports:**

- `createHonoHandler()` - Catch-all API handler that delegates to the CMS Hono app
- `getServerAuth()` - Returns `{ user, session } | null` (cookies only)
- `requireServerAuth()` - Throws if unauthenticated
- `withServerAuth()` - Wrapper for server actions

[Read full documentation →](./packages/next/README.md)

## Example: Blog Application

The `examples/blog` directory contains a complete blog application demonstrating:

- ✅ Three collections: users, posts, categories
- ✅ Authentication with better-auth
- ✅ Role-based access control (admin, author, user)
- ✅ Auto-slug generation hooks
- ✅ Relationship fields (author, category)
- ✅ Rich text content
- ✅ API routes for CRUD operations
- ✅ Field validation

[View example →](./examples/blog/README.md)

## Development

```bash
# Install dependencies
pnpm install
# Build all packages
pnpm run build
# Lint
pnpm run lint
# Type check
pnpm run type-check
# Develop example
pnpm -F @examples/blog run dev

```

## Tech Stack

- **TypeScript 5.7**: Full type safety
- **Next.js 15**: App Router
- **PostgreSQL**: Database
- **Kysely 0.27**: Type-safe SQL query builder
- **Better-Auth 1.1**: Modern authentication
- **Zod 3.24**: Runtime validation
- **pnpm**: Package manager

## License

MIT

## Credits

Inspired by [Payload CMS](https://payloadcms.com) - an excellent production-ready CMS. Tiny-CMS is a simplified alternative for projects that don't need the full complexity.
