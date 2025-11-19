# Core API, Auth, and SDK

This document describes how the core HTTP API, authentication layer, and SDK work together.
Everything here lives inside `@tiny-cms/core` – there are no framework‑specific assumptions.

At a high level:
- The `TinyCMS` class owns collections, validation, hooks, access control, and database access.
- A Hono app is created internally and exposes REST‑style routes for collections and auth.
- Middleware wires the CMS instance into every request, performs lazy DB initialization, and enables CORS.
- The SDK is a thin, type‑safe client for calling these routes from browsers, server code, or tools.

## Request flow

When you construct a `TinyCMS` instance, it:
- creates a `Hono<TinyCmsHonoEnv>` app with `baseApiPath` from the config (default `/`),
- runs the config through the plugin pipeline (`buildConfig(config, app)`),
- attaches global middleware, and
- registers all built‑in routes with `registerRoutes(app, cms)`.

```ts
import { TinyCMS, defineConfig } from '@tiny-cms/core'

const config = defineConfig({
  db: myDatabaseAdapter,
  collections: [...],
  auth: {
    operations: myAuthOperations,
    config: myAuthConfig,
  },
  baseApiPath: '/', // optional, defaults to '/'
})

const cms = new TinyCMS(config)
const app = cms.app // Hono instance with all routes registered
```

Every request passes through three core middlewares:
- **CORS**: `cors()` is applied to `*`, so cross‑origin requests are allowed according to Hono’s defaults.
- **CMS context**: the `TinyCMS` instance is stored on `c.set('cms', cms)` and later accessed via `c.get('cms')`.
- **Lazy initialization**: `cms.init()` runs on the first request, calling `config.db.connect()` exactly once.

All route handlers retrieve the CMS from the context and then call high‑level methods like `cms.find`, `cms.create`,
`cms.update`, etc. This keeps HTTP concerns (params, query parsing, status codes) separate from business logic.

## Collections HTTP API and handlers

The core exposes a small set of REST‑style endpoints under the base path:

- `GET    /collections/:collection` – list documents
- `GET    /collections/:collection/count` – count documents
- `GET    /collections/:collection/:id` – fetch a single document
- `POST   /collections/:collection` – create
- `PATCH  /collections/:collection/:id` – update
- `DELETE /collections/:collection/:id` – delete

Each handler:
- pulls basic parameters from the URL (`collection`, `id`),
- parses query or body where needed, and
- calls the corresponding `TinyCMS` method.

The primary handlers live in `src/routes/operations.controller.ts` and follow this pattern:

- `findHandler`
  - parses `limit`, `offset` from query string (defaults to 10 and 0),
  - accepts an optional `where` JSON string,
  - calls `cms.find(collection, options, user)` and returns the `FindResult` as JSON.

- `createHandler`
  - reads JSON body as document data,
  - resolves auth (see below) and rejects unauthenticated calls with `401`,
  - calls `cms.create(collection, data, user)` and returns the created document with status `201`.

- `findByIdHandler`
  - reads `:id` from the path,
  - calls `cms.findById(collection, id, user)` and returns `404` when the document does not exist.

- `updateHandler`
  - resolves auth and denies unauthenticated requests,
  - reads JSON body,
  - calls `cms.update(collection, id, data, user)` and returns the updated document.

- `deleteHandler`
  - resolves auth and denies unauthenticated requests,
  - calls `cms.delete(collection, id, user)` and returns `{ success: true }` on success.

- `countHandler`
  - optionally parses `where` from the query string,
  - calls `cms.count(collection, options, user)` and returns `{ count }`.

All handlers follow the same error contract:
- On invalid input (e.g. unparsable `where`), they return `400` with `{ error: string }`.
- On explicit 404 conditions (e.g. `findById` returns null), they return `404` with `{ error: 'Document not found' }`.
- On internal errors (validation/access/db issues), they return `500` with `{ error: message }`.

The health endpoint is a simple diagnostic:

- `GET /health` → `{ status: 'ok', version: '0.1.0' }`

## Authentication routes and middleware

Authentication is completely driven by the `auth` block in the core config. If `config.auth` is not provided,
no auth routes are registered and the `cms.auth` getter throws at runtime.

When `auth` **is** configured:
- the registered routes under `/auth/*` delegate to the `AuthOperations` interface,
- cookies from the underlying auth implementation are surfaced via `Set-Cookie` headers, and
- read/write operations on collections use cookie‑based auth for user context and authorization.

The concrete routes are:

- `POST /auth/sign-in` – body `{ email, password }`
- `POST /auth/sign-up` – body `{ email, password, name }`
- `POST /auth/sign-out` – sign out the current session
- `POST /auth/signout` and `GET /auth/signout` – alias for sign‑out (useful for links)
- `GET  /auth/session` – returns `{ user, session }` or `{ user: null, session: null }`
- Optional flows:
  - `POST /auth/password/forgot` – body `{ email }`
  - `POST /auth/password/reset` – body `{ token, newPassword }`
  - `POST /auth/email/verify` – body `{ token }`

Handlers:
- translate the HTTP `Request` into `AuthOperations` calls (e.g. `signIn`, `signOut`, `getSession`),
- capture any cookies emitted by the underlying library,
- propagate them back to the client via `Set-Cookie`,
- normalize success responses to `{ user, session }` or `{ success: true }`, and
- normalize errors to `{ error: string }` with a 4xx status code.

### Cookie‑only auth helpers

Core ships small helpers for resolving the authenticated user purely from request cookies:

- `resolveAuthFromCookie(cms, cookieHeader)` – framework‑agnostic helper
  - builds a `Headers` object containing only the `cookie` header,
  - calls `cms.auth.getSession(headers)` and returns `{ user, session }` or `{}`.

- `honoOptionalAuth(c)` – convenience wrapper used by the built‑in route handlers
  - reads the `cookie` header from the Hono request,
  - calls `resolveAuthFromCookie` and returns the same `{ user?, session? }` shape.

These helpers are intentionally minimal: integrations should reuse them instead of re‑implementing cookie parsing.
Mutating collection routes use `honoOptionalAuth` and reject unauthenticated users at the handler level with `401`.
More fine‑grained rules are implemented at the **collection access control** layer (see `collections.md`).

## SDK and HTTP API together

The SDK is a small wrapper over the HTTP API described above. It constructs URLs from:
- `baseUrl` – the origin where your Hono app is mounted,
- `apiPrefix` – a prefix applied before all core paths (defaults to `/api`), and
- a path segment that matches the registered routes (e.g. `/collections/posts`).

```ts
import { TinyCmsSDK } from '@tiny-cms/core/sdk'

const sdk = new TinyCmsSDK({
  baseUrl: 'https://example.com',
  apiPrefix: '/api', // default
})
```

All SDK methods:
- send JSON by default (falling back to `FormData` when a `file` is provided),
- include `credentials: 'include'` so cookie‑based auth works out of the box,
- throw `SDKError` on non‑2xx responses, carrying `status` and parsed error payloads, and
- parse successful responses as JSON into typed results.

The SDK is designed to be type‑safe via declaration merging:

```ts
// Somewhere in your app types
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

Once you provide a `CollectionDocumentMap`, the SDK infers types for per‑collection operations.

### Collections via SDK

Each collection method corresponds to one or more HTTP routes:

```ts
// List documents: GET /collections/posts
const result = await sdk.find({
  collection: 'posts',
  where: { published: { equals: true } },
  sort: '-createdAt', // or 'createdAt:desc'
  limit: 10,
  offset: 0,
})

// GET /collections/posts/:id
const post = await sdk.findById({
  collection: 'posts',
  id: 'post-123',
})

// POST /collections/posts
const created = await sdk.create({
  collection: 'posts',
  data: {
    title: 'New post',
    content: 'Hello world',
  },
})

// PATCH /collections/posts/:id
const updated = await sdk.update({
  collection: 'posts',
  id: 'post-123',
  data: { published: true },
})

// DELETE /collections/posts/:id
await sdk.delete({
  collection: 'posts',
  id: 'post-123',
})

// GET /collections/posts/count
const { totalDocs } = await sdk.count({
  collection: 'posts',
  where: { published: { equals: true } },
})
```

### Calling auth and custom routes

Auth routes live under `/auth/*` and follow the response/error conventions described earlier.
You can call them directly via `request`:

```ts
// Sign in
const { user, session } = await sdk.request<{
  user: unknown
  session: unknown
}>({
  method: 'POST',
  path: '/auth/sign-in',
  body: { email: 'user@example.com', password: 'secret' },
})

// Get current session
const current = await sdk.request<{ user: unknown | null; session: unknown | null }>({
  method: 'GET',
  path: '/auth/session',
})
```

Plugins can register arbitrary routes on the same Hono app. Because the SDK exposes a generic `request` method,
you can call those routes using the same baseUrl/apiPrefix configuration and re‑use the same error handling.
