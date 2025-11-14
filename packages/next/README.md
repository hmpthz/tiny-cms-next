# @tiny-cms/next

Next.js integration for tiny-cms. Provides a catch-all Hono handler for API routes and cookie-only auth helpers for Server Components and server actions.

## Installation

```bash
pnpm add @tiny-cms/next @tiny-cms/core @tiny-cms/db-postgres
```

## Quick Start

### 1) Configure CMS

```ts
// lib/cms.ts
import { defineConfig, TinyCMS, createAuth } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db-postgres'

export const cmsConfig = defineConfig({
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL! } }),
  auth: {
    operations: createAuth({ database: { connectionString: process.env.DATABASE_URL! }, secret: process.env.AUTH_SECRET! }),
    config: { enabled: true },
  },
  collections: [/* ... */],
})

const cms = new TinyCMS(cmsConfig)
export function getCMS() { return cms }
```

### 2) Catch-all API route

```ts
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

### 3) Admin pages and server actions (cookies-only)

```ts
// app/admin/[...slug]/layout.tsx
import { RootLayout } from '@tiny-cms/next/admin'
import { getCMS } from '@/lib/cms'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RootLayout cms={getCMS()}>{children}</RootLayout>
}
```

```ts
// app/admin/[...slug]/page.tsx
import { RootPage } from '@tiny-cms/next/admin'
import { getCMS } from '@/lib/cms'

export default async function AdminPage({ params, searchParams }: { params: Promise<{ slug: string[] }>; searchParams: Promise<Record<string, string>> }) {
  const cms = getCMS()
  const { slug } = await params
  const search = await searchParams
  return <RootPage cms={cms} segments={slug || []} searchParams={search} />
}
```

## Auth Helpers (cookies-only)

```ts
import { authorize, getServerAuth, requireServerAuth, withServerAuth } from '@tiny-cms/next'

// Server Component
const { user } = await authorize(getCMS())

// Server action wrapper
export const savePost = withServerAuth(getCMS(), async ({ user }, id: string, data: any) => {
  return getCMS().update('posts', id, data, user)
})
```

## API Endpoints

When auth is configured, the Hono app exposes:

- `POST /auth/sign-in`
- `POST /auth/sign-up`
- `POST /auth/sign-out` and `GET /auth/signout`
- `GET /auth/session`

These are available under `/api/*` when using `createHonoHandler` in App Router.

## Notes

- Use cookies only; no custom auth headers.
- Business logic stays in `@tiny-cms/core`. The Next package is a thin integration.

## License

MIT

