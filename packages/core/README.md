# @tiny-cms/core

Core runtime for Tiny CMS – a lightweight, type-safe headless CMS. This package owns:
- collections and CRUD operations,
- validation and hooks,
- access control,
- the adapter and plugin interfaces, and
- the Hono HTTP API surface (including auth routes).

Integrations and UI live in other packages; this README only describes the core runtime.

## Features

- **Small surface area** – a handful of concepts: config, collections, hooks, access, auth, and plugins.
- **Type-safe** – strict TypeScript with declaration merging for collection document types.
- **Runtime validation** – field definitions compile to Zod schemas for consistent validation.
- **HTTP first** – Hono app is created internally and exposes stable REST-style routes.
- **Plugin-friendly** – plugins can transform config and register additional routes.
- **Storage-agnostic** – a narrow `DatabaseAdapter` interface allows any database implementation.

## Installation

```bash
pnpm add @tiny-cms/core
```

## Quick start

Minimal setup with a custom database adapter and one collection:

```ts
import { TinyCMS, defineConfig } from '@tiny-cms/core'
import type { DatabaseAdapter } from '@tiny-cms/core'

const db: DatabaseAdapter = {
  name: 'example',
  async connect() {},
  async disconnect() {},
  async create(collection, data) {
    // persist and return the stored row
    return { id: 'doc-id', ...data }
  },
  async find(collection, options) {
    return {
      docs: [],
      totalDocs: 0,
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
      totalPages: 0,
      page: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  },
  async findById() {
    return null
  },
  async update(collection, id, data) {
    return { id, ...data }
  },
  async delete() {},
  async count() {
    return 0
  },
  schema: {
    async createTable() {},
    async dropTable() {},
    async tableExists() {
      return true
    },
  },
}

const config = defineConfig({
  db,
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

const cms = new TinyCMS(config)

// `cms.app` is a Hono instance with routes like:
// - GET  /collections/:collection
// - POST /collections/:collection
// - GET  /collections/:collection/:id
// - PATCH/DELETE /collections/:collection/:id
// - GET  /collections/:collection/count
// - GET  /auth/session (when auth is configured)
```

## Documentation

Core docs are split by concern:

- [Config](./docs/config.md) – root config, database adapter, auth, and plugins.
- [Collections](./docs/collections.md) – collection shape, fields, hooks, validation, access control.
- [API](./docs/api.md) – HTTP routes, auth behavior, and SDK usage together.

These documents only describe `@tiny-cms/core`. Framework and UI integrations document their own behavior.

## TypeScript support

Core provides declaration‑merging hooks so you can type collection documents and reuse those types across
your application and SDK usage:

```ts
// app/types/cms.d.ts
import '@tiny-cms/core'

declare module '@tiny-cms/core' {
  interface CollectionDocumentMap {
    posts: {
      id: string
      title: string
      content: string
      published: boolean
    }
  }
}
```

The SDK then infers types per collection, for example:

```ts
import { TinyCmsSDK } from '@tiny-cms/core/sdk'

const sdk = new TinyCmsSDK({ baseUrl: 'https://example.com' })

const post = await sdk.findById({ collection: 'posts', id: 'id-123' })
// post.title is typed as string
```

## License

MIT

