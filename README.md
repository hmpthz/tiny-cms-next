# Tiny-CMS

**A simplified, production-ready headless CMS built with Next.js, TypeScript, and PostgreSQL.**

Tiny-CMS is inspired by Payload CMS but drastically simplified - **98.5% less code** (4K vs 276K lines) while maintaining essential CMS functionality.

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
│   ├── core/          # Core CMS logic (~1,200 LOC)
│   ├── db/            # Kysely PostgreSQL adapter (~500 LOC)
│   └── next/          # Next.js integration (~400 LOC)
└── examples/
    └── blog/          # Full blog example
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
pnpm -r build
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

Create CRUD endpoints with one file:

```typescript
// app/api/collections/[collection]/route.ts
import { createCollectionHandlers } from '@tiny-cms/next'

export async function GET(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.GET(request)
}
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
- `createCMS()` - Factory function
- `defineConfig()` - Config helper
- `createAuthWrapper()` - Better-auth integration

[Read full documentation →](./packages/core/README.md)

### @tiny-cms/db

PostgreSQL database adapter using Kysely ORM.

**Key Exports:**

- `postgresAdapter()` - Kysely adapter factory
- `SchemaBuilder` - Schema generation from collections

[Read full documentation →](./packages/db/README.md)

### @tiny-cms/next

Next.js integration with API route handlers and middleware.

**Key Exports:**

- `createCollectionHandlers()` - CRUD route handlers
- `createAuthMiddleware()` - Auth middleware
- `requireUser()` - Server action helpers

[Read full documentation →](./packages/next/README.md)

## Comparison to Payload CMS

| Aspect            | Payload CMS | Tiny-CMS | Reduction |
| ----------------- | ----------- | -------- | --------- |
| **Total LOC**     | ~276,672    | ~2,100   | **98.5%** |
| **Packages**      | 41          | 3        | 93%       |
| **Field Types**   | 30+         | 8        | 73%       |
| **Hook Points**   | 10+         | 3        | 70%       |
| **DB Operations** | 30+         | 6        | 80%       |
| **Dependencies**  | 50+         | ~10      | 80%       |

### What We Kept

- Collection-based architecture
- Field system
- Access control pattern
- Basic hooks (3 instead of 10+)
- Type generation capability
- Database adapter pattern

### What We Simplified

- **Authentication**: Use better-auth instead of custom implementation
- **Admin UI**: Build custom with shadcn/ui instead of 40K LOC built-in
- **Database Schema**: 1 table per collection (JSONB for arrays) instead of 5+ tables
- **Field Types**: 8 essential types instead of 30+
- **Hooks**: 3 hooks instead of 10+ execution points

### What We Removed

- Versions & Drafts
- Localization (can use next-intl)
- GraphQL (REST only)
- Job Queue
- Email System (better-auth handles it)
- Multiple Storage/Database support
- Plugin System (direct code integration)
- Live Preview

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
pnpm -r build

# Run builds in watch mode
pnpm -r dev

# Lint
pnpm -r lint

# Type check
pnpm -r type-check
```

## Tech Stack

- **TypeScript 5.7**: Full type safety
- **Next.js 15**: App Router
- **PostgreSQL**: Database
- **Kysely 0.27**: Type-safe SQL query builder
- **Better-Auth 1.1**: Modern authentication
- **Zod 3.24**: Runtime validation
- **pnpm**: Package manager

## Philosophy

### KISS (Keep It Simple, Stupid)

- Straightforward, uncomplicated solutions
- No over-engineering
- Readable and maintainable code

### YAGNI (You Aren't Gonna Need It)

- Implement only what's currently needed
- No speculative features
- Minimal code bloat

## License

MIT

## Credits

Inspired by [Payload CMS](https://payloadcms.com) - an excellent production-ready CMS. Tiny-CMS is a simplified alternative for projects that don't need the full complexity.
