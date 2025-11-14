# @tiny-cms/core

Core package for Tiny CMS — the lightweight, type-safe headless CMS runtime for Next.js applications. Core owns the runtime (collections, CRUD, hooks, access control), defines the adapter and plugin interfaces, and exposes the Hono API app used by integrations like `@tiny-cms/next`.

## Features

- 🚀 **Lightweight & Fast** — Minimal deps, optimized runtime
- 🔐 **Built-in Auth** — Better-auth integration (cookies only)
- 📝 **Type-safe** — Strict TypeScript with inference
- 🎯 **RESTful API** — Hono app with route registration
- 🔌 **Extensible Plugins** — Plugins can extend config, register API routes, and augment the client SDK
- 🧩 **Adapter Interfaces** — Core defines a database adapter interface; `@tiny-cms/db-postgres` is the official PostgreSQL implementation
- ⚡ **Serverless Ready** — Edge-friendly design

## Installation

```bash
pnpm add @tiny-cms/core
```

## Quick Start

```typescript
import { TinyCMS, defineConfig } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db-postgres'

const config = defineConfig({
  db: postgresAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  collections: [
    {
      name: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext' },
        { name: 'published', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
})

// Create CMS instance (synchronous - lazy DB initialization)
const cms = new TinyCMS(config)

// Use in your API routes
export const GET = cms.app.fetch
```

## Documentation

### Core Concepts

- [Configuration](./docs/configuration.md) - CMS setup and options
- [Collections](./docs/collections.md) - Defining data models
- [Field Types](./docs/field-types.md) - Available field types
- [Validation](./docs/validation.md) - Data validation rules

### API & SDK

- [API Routes](./docs/api-routes.md) - RESTful endpoints and Hono.js integration
- [SDK Usage](./docs/sdk.md) - Type-safe client SDK
- [Authentication](./docs/auth.md) - User authentication with better-auth

### Advanced Features

- [Hooks](./docs/hooks.md) - Lifecycle hooks for data manipulation
- [Access Control](./docs/access-control.md) - Fine-grained permissions
- [Plugins](./docs/plugins.md) - Extend CMS by contributing config, API routes (mounted into the Hono app), and optional SDK methods
- [Database Adapters](./docs/database-adapters.md) - Core adapter interface; `db-postgres` is one implementation (official)

### Integration

- [Next.js Setup](./docs/nextjs.md) - Integration with Next.js App Router
- [Deployment](./docs/deployment.md) - Production deployment guide

## Basic Example

### Server Setup

```typescript
// app/api/[[...route]]/route.ts
import { TinyCMS } from '@tiny-cms/core'
import { createHonoHandler } from '@tiny-cms/next'
import { config } from '@/cms.config'

const cms = new TinyCMS(config)
const handler = createHonoHandler(cms)

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
```

### Client Usage

```typescript
// app/posts/page.tsx
import { TinyCmsSDK } from '@tiny-cms/core/sdk'

const sdk = new TinyCmsSDK({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL,
})

export default async function PostsPage() {
  const { docs: posts } = await sdk.find('posts', {
    where: { published: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <div>{post.content}</div>
        </article>
      ))}
    </div>
  )
}
```

## Architecture

Tiny‑CMS core is modular with clear extension points:

- Core Runtime: Owns collections, CRUD, validation, hooks, and access control.
- Hono API App: The HTTP surface for all core and plugin routes. Next.js uses this via `@tiny-cms/next`.
- Database Adapter: A narrow interface consumed by core. `@tiny-cms/db-postgres` is the official implementation using Kysely/pg.
- Plugin System: Plugins can extend config, register additional API routes in the Hono app, and optionally augment the client SDK.

In Next.js, `@tiny-cms/next` forwards all requests to the core Hono app. Any routes contributed by plugins (e.g., storage) are automatically available under your `/api/*` catch‑all route.

## TypeScript Support

Full type inference for collections:

```typescript
// Declare your collection types
declare module '@tiny-cms/core' {
  interface CollectionDocumentMap {
    posts: {
      title: string
      content: string
      published: boolean
    }
  }
}

// Get full type safety
const post = await sdk.findById('posts', 'id-123')
// post.title is correctly typed as string
```

## License

MIT
