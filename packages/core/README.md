# @tiny-cms/core

Core package for Tiny CMS - a lightweight, type-safe headless CMS for Next.js applications.

## Features

- 🚀 **Lightweight & Fast** - Minimal dependencies, optimized for performance
- 🔐 **Built-in Auth** - Powered by better-auth
- 📝 **Type-safe** - Full TypeScript support with type inference
- 🎯 **RESTful API** - Built with Hono.js
- 🔌 **Plugin System** - Extensible architecture
- 🎨 **Database Agnostic** - Support for PostgreSQL (more coming)
- ⚡ **Serverless Ready** - Optimized for edge functions

## Installation

```bash
pnpm add @tiny-cms/core
```

## Quick Start

```typescript
import { createCMS, defineConfig } from '@tiny-cms/core'
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
const cms = createCMS(config)

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
- [Plugins](./docs/plugins.md) - Extending CMS functionality
- [Database Adapters](./docs/database-adapters.md) - Database integration

### Integration

- [Next.js Setup](./docs/nextjs.md) - Integration with Next.js App Router
- [Deployment](./docs/deployment.md) - Production deployment guide

## Basic Example

### Server Setup

```typescript
// app/api/[[...route]]/route.ts
import { createCMS } from '@tiny-cms/core'
import { createHonoHandler } from '@tiny-cms/next'
import { config } from '@/cms.config'

const cms = createCMS(config)
const handler = createHonoHandler(cms)

export const { GET, POST, PATCH, DELETE } = handler
```

### Client Usage

```typescript
// app/posts/page.tsx
import { TinyCmsSDK } from '@tiny-cms/core'

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

The CMS follows a modular architecture:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│  Hono App   │────▶│     CMS     │
│   Routes    │     │  (Router)   │     │   (Core)    │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Plugins   │     │   Database  │
                    │  (Storage,  │     │   Adapter   │
                    │   Search)   │     │ (PostgreSQL)│
                    └─────────────┘     └─────────────┘
```

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
