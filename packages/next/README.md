# @tiny-cms/next

Next.js integration for tiny-cms providing API route handlers, middleware, and server action utilities.

## Installation

```bash
pnpm add @tiny-cms/next @tiny-cms/core
```

## Quick Start

### 1. Create CMS Configuration

```typescript
// lib/cms.ts
import { createCMS, defineConfig } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db'

export const config = defineConfig({
  db: postgresAdapter({
    /* ... */
  }),
  collections: [
    /* ... */
  ],
})

let cmsInstance: Awaited<ReturnType<typeof createCMS>> | null = null

export async function getCMS() {
  if (!cmsInstance) {
    cmsInstance = await createCMS(config)
  }
  return cmsInstance
}
```

### 2. Create API Routes

```typescript
// app/api/collections/[collection]/route.ts
import { createCollectionHandlers } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'

export async function GET(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.GET(request)
}

export async function POST(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.POST(request)
}
```

### 3. Add Auth Middleware

```typescript
// middleware.ts
import { createAuthMiddleware } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'

export async function middleware(request: NextRequest) {
  const cms = await getCMS()

  const authMiddleware = createAuthMiddleware(cms, {
    protectedPaths: ['/admin', '/dashboard'],
    publicPaths: ['/sign-in', '/sign-up', '/api/auth'],
    redirectTo: '/sign-in',
  })

  return authMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## API Route Handlers

### createCollectionHandlers(cms, collectionName)

Creates GET and POST handlers for collection routes.

**GET /api/collections/[collection]** - List documents

Query parameters:

- `limit` - Number of documents to return (default: 10)
- `offset` - Number of documents to skip (default: 0)
- `where` - JSON-encoded where clause

```typescript
// Example request
GET /api/collections/posts?limit=10&offset=0&where={"published":true}

// Response
{
  "docs": [...],
  "totalDocs": 42,
  "limit": 10,
  "offset": 0,
  "totalPages": 5,
  "page": 1,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

**POST /api/collections/[collection]** - Create document

```typescript
// Example request
POST /api/collections/posts
{
  "title": "New Post",
  "content": "Content here",
  "published": true
}

// Response (201 Created)
{
  "id": "uuid-here",
  "title": "New Post",
  "content": "Content here",
  "published": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### createDocumentHandlers(cms, collectionName)

Creates GET, PATCH, and DELETE handlers for document routes.

```typescript
// app/api/collections/[collection]/[id]/route.ts
import { createDocumentHandlers } from '@tiny-cms/next'

export async function GET(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createDocumentHandlers(cms, params.collection)
  return handlers.GET(request, context)
}

export async function PATCH(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createDocumentHandlers(cms, params.collection)
  return handlers.PATCH(request, context)
}

export async function DELETE(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createDocumentHandlers(cms, params.collection)
  return handlers.DELETE(request, context)
}
```

**GET /api/collections/[collection]/[id]** - Get document

**PATCH /api/collections/[collection]/[id]** - Update document

**DELETE /api/collections/[collection]/[id]** - Delete document

## Middleware

### createAuthMiddleware(cms, options)

Creates authentication middleware for protecting routes.

```typescript
export interface AuthMiddlewareOptions {
  protectedPaths?: string[] // Require auth
  publicPaths?: string[] // Always accessible
  redirectTo?: string // Redirect destination (default: '/sign-in')
}
```

Example:

```typescript
const authMiddleware = createAuthMiddleware(cms, {
  protectedPaths: ['/admin', '/dashboard', '/profile'],
  publicPaths: ['/sign-in', '/sign-up', '/api/auth', '/'],
  redirectTo: '/sign-in',
})
```

### requireAuth(cms, request)

Require authentication or throw error. Use in route handlers:

```typescript
import { requireAuth } from '@tiny-cms/next'

export async function POST(request: NextRequest) {
  const cms = await getCMS()
  const user = await requireAuth(cms, request) // Throws if not authenticated

  // User is authenticated
  return NextResponse.json({ user })
}
```

### getOptionalUser(cms, request)

Get user if authenticated, null otherwise:

```typescript
import { getOptionalUser } from '@tiny-cms/next'

export async function GET(request: NextRequest) {
  const cms = await getCMS()
  const user = await getOptionalUser(cms, request) // Returns null if not authenticated

  // Customize response based on user
  return NextResponse.json({ user })
}
```

### Role Helpers

```typescript
import { hasRole, hasAnyRole } from '@tiny-cms/next'

// Check single role
if (hasRole(user, 'admin')) {
  // User is admin
}

// Check multiple roles
if (hasAnyRole(user, ['admin', 'editor'])) {
  // User has any of these roles
}
```

## Server Actions

For server components and server actions:

### getCurrentUser(cms)

Get current user in server component/action:

```typescript
import { getCurrentUser } from '@tiny-cms/next'

export async function MyServerComponent() {
  const cms = await getCMS()
  const user = await getCurrentUser(cms) // Returns null if not authenticated

  return <div>Hello {user?.name}</div>
}
```

### requireUser(cms)

Require user in server action (throws if not authenticated):

```typescript
'use server'

import { requireUser } from '@tiny-cms/next'

export async function createPost(formData: FormData) {
  const cms = await getCMS()
  const user = await requireUser(cms) // Throws if not authenticated

  const post = await cms.create('posts', {
    title: formData.get('title'),
    author: user.id,
  })

  return post
}
```

### requireRole(cms, role)

Require specific role:

```typescript
'use server'

import { requireRole } from '@tiny-cms/next'

export async function deletePost(id: string) {
  const cms = await getCMS()
  await requireRole(cms, 'admin') // Throws if not admin

  await cms.delete('posts', id)
}
```

### requireAnyRole(cms, roles)

Require any of multiple roles:

```typescript
'use server'

import { requireAnyRole } from '@tiny-cms/next'

export async function publishPost(id: string) {
  const cms = await getCMS()
  await requireAnyRole(cms, ['admin', 'editor']) // Throws if neither

  await cms.update('posts', id, { published: true })
}
```

## Error Handling

API route handlers automatically handle common errors:

- **403 Forbidden** - Access denied
- **404 Not Found** - Document not found
- **400 Bad Request** - Validation failed
- **500 Internal Server Error** - Other errors

```typescript
// Automatic error responses
{
  "error": "Access denied for reading posts"
}
```

## Complete Example

```typescript
// lib/cms.ts
import { createCMS, defineConfig, createAuthWrapper } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db'
import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const auth = betterAuth({ database: pool, emailAndPassword: { enabled: true } })

export const config = defineConfig({
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } }),
  auth: {
    operations: createAuthWrapper(auth),
    config: { enabled: true },
  },
  collections: [
    {
      name: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext' },
      ],
      access: {
        read: () => true,
        create: ({ user }) => !!user,
      },
    },
  ],
})

let cmsInstance: Awaited<ReturnType<typeof createCMS>> | null = null

export async function getCMS() {
  if (!cmsInstance) {
    cmsInstance = await createCMS(config)
  }
  return cmsInstance
}

// middleware.ts
import { createAuthMiddleware } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'

export async function middleware(request) {
  const cms = await getCMS()
  const authMiddleware = createAuthMiddleware(cms, {
    protectedPaths: ['/admin'],
    publicPaths: ['/sign-in', '/api/auth'],
  })
  return authMiddleware(request)
}

// app/api/collections/[collection]/route.ts
import { createCollectionHandlers } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'

export async function GET(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.GET(request)
}

export async function POST(request, context) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.POST(request)
}
```

## TypeScript

Full TypeScript support:

```typescript
import type { RouteContext, AuthMiddlewareOptions } from '@tiny-cms/next'
```

## License

MIT
