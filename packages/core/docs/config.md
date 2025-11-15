# Core Configuration and Plugin System

The configuration object is the single source of truth for `@tiny-cms/core`. It describes:
- how to talk to your database,
- which collections exist,
- how authentication is wired,
- which plugins should extend the system, and
- where the HTTP API is mounted.

This document focuses on the core config format and the built‑in plugin mechanism.

## Top‑level config shape

Core exposes a typed `Config` interface and a small `defineConfig` helper:

```ts
import { defineConfig } from '@tiny-cms/core'
import type { Config } from '@tiny-cms/core'

export const config: Config = defineConfig({
  db: myDatabaseAdapter,
  collections: [...],
  auth: {
    operations: myAuthOperations,
    config: myAuthConfig,
  },
  plugins: [
    myFirstPlugin,
    mySecondPlugin,
  ],
  baseApiPath: '/', // optional
})
```

The main properties:

- `db: DatabaseAdapter`
  - required; encapsulates all persistence operations and schema utilities.
  - see below for the interface.

- `collections: Collection[]`
  - required; list of collections defined by this CMS instance.
  - see `collections.md` for details.

- `auth?: { operations: AuthOperations; config: AuthConfig }`
  - optional; if present, enables core auth routes and helpers.
  - `operations` is usually created via `createAuth` (see Auth section).

- `plugins?: Plugin[]`
  - optional; each plugin can transform config and register routes.

- `baseApiPath?: string`
  - optional; passed to Hono’s `basePath` to mount all routes under a prefix.

## Database adapter interface

Core is storage‑agnostic. Any database or driver that implements the `DatabaseAdapter` interface can be used:

```ts
interface DatabaseAdapter {
  name?: string
  connect(): Promise<void>
  disconnect(): Promise<void>

  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  find(collection: string, options?: FindOptions): Promise<FindResult>
  findById(collection: string, id: string): Promise<Record<string, unknown> | null>
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>
  delete(collection: string, id: string): Promise<void>
  count(collection: string, options?: FindOptions): Promise<number>

  query?<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  createIndex?(collection: string, fields: string[], type?: 'btree' | 'gin' | 'gist'): Promise<void>

  beginTransaction?(): Promise<string>
  commitTransaction?(id: string): Promise<void>
  rollbackTransaction?(id: string): Promise<void>

  schema: {
    createTable(tableName: string, columns: TableColumn[]): Promise<void>
    dropTable(tableName: string): Promise<void>
    tableExists(tableName: string): Promise<boolean>
    alterTable?(tableName: string, changes: TableChanges): Promise<void>
    runMigration?(sql: string): Promise<void>
    setupCollectionTables?(collections: Collection[]): Promise<void>
  }
}
```

A typical adapter will:
- implement `connect`/`disconnect` to manage pooled connections,
- translate `FindOptions` into whatever query builder or SQL you use,
- build and migrate tables from `Collection` definitions via `schema`,
- optionally expose `query`/`createIndex`/transactions for advanced use cases.

Core only calls these methods; it does not dictate how they are implemented, which keeps the runtime small.

## Auth integration in config

Authentication is configured via the `auth` key on the root config. The core package provides a small
`createAuth` helper that wraps `better-auth` and produces an `AuthOperations` implementation:

```ts
import { createAuth } from '@tiny-cms/core'
import type { AuthConfig } from '@tiny-cms/core'

const authConfig: AuthConfig = {
  enabled: true,
  requireEmailVerification: false,
  sessionExpiration: 60 * 60 * 24 * 7,
  roles: ['admin', 'editor', 'viewer'],
  defaultRole: 'editor',
}

const authOperations = createAuth({
  database: myAuthDatabaseConnection,
  secret: process.env.AUTH_SECRET!,
  config: authConfig,
  trustedOrigins: ['http://localhost:3000'],
  baseURL: process.env.APP_URL,
})

export const config = defineConfig({
  db: myDatabaseAdapter,
  collections: [...],
  auth: {
    operations: authOperations,
    config: authConfig,
  },
})
```

`AuthOperations` exposes the methods that core uses in its auth controllers:
- `signIn`, `signUp`, `signOut`,
- `getSession`,
- `verifyEmail`, `forgotPassword`, `resetPassword`.

The `AuthConfig` structure drives behavior (session lifetime, email verification, hooks, roles).
Because this is part of the core config, you can keep all auth‑related concerns colocated with collections
and plugins, while integrations simply plug into the HTTP routes and cookie behavior.

## Plugin system and config transformation

Plugins are functions that receive a `Config` and return a new `Config`. They can:
- add new collections or modify existing ones,
- attach hooks or access rules,
- apply environment‑specific defaults,
- and optionally register additional routes with the Hono app.

The core plugin type:

```ts
import type { Hono } from 'hono'

export interface Plugin {
  (config: Config): Config
  registerRoutes?: (app: Hono<any>) => void
}
```

When you construct `new TinyCMS(config)`:
- core clones the initial config into `finalConfig`,
- iterates over `config.plugins` in order,
- calls each plugin with the current `finalConfig`,
- uses the plugin’s return value as the next `finalConfig`, and
- if a plugin has `registerRoutes` and the Hono app is available, calls `plugin.registerRoutes(app)`.

The resulting `finalConfig` is stored on the CMS instance and exposed via `cms.getConfig()`.

### Example: config‑only plugin

```ts
import type { Plugin } from '@tiny-cms/core'

export const auditPlugin: Plugin = (config) => {
  const collections = config.collections.map((collection) => ({
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: async ({ doc, context, previousDoc }) => {
        // Call any existing hook first
        await collection.hooks?.afterChange?.({ doc, context, previousDoc })
        console.log('Audit log', {
          collection: context.collection,
          user: context.user?.email,
          before: previousDoc,
          after: doc,
        })
      },
    },
  }))

  return { ...config, collections }
}
```

### Example: plugin that also registers routes

```ts
export const metricsPlugin: Plugin = (config) => config

metricsPlugin.registerRoutes = (app) => {
  app.get('/metrics/ping', (c) => {
    const cms = c.get('cms')
    return c.json({
      ok: true,
      collections: cms.getConfig().collections.map((c) => c.name),
    })
  })
}
```

Plugin execution order is deterministic: earlier plugins run first and later plugins can see and refine their changes.
Route registration happens after all plugins have transformed the config, so plugins can rely on the final shape.

## baseApiPath and HTTP surface

The `baseApiPath` field controls where the Hono app is mounted. Internally, core does:

```ts
const app = new Hono<TinyCmsHonoEnv>().basePath(config.baseApiPath || '/')
```

This means:
- all built‑in routes (collections, auth, health) are registered relative to `baseApiPath`, and
- any routes added by plugins via `registerRoutes` will also be relative to that base path.

If you keep `baseApiPath` as `/`, the core routes are exposed at:
- `/collections/*`
- `/auth/*`
- `/health`

If you set `baseApiPath` to some prefix, the entire API shifts accordingly. The SDK’s `apiPrefix` option should
match whatever external path you expose when wiring the Hono app into your runtime environment.

