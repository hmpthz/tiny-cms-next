# Authentication

Tiny-CMS uses better-auth under the hood. The core package exposes a small, framework-agnostic surface area and Hono controllers that work purely with cookies.

Key principles:
- Cookies only. No custom authorization headers.
- Logic centralized in core; integrations are thin wrappers.
- Strong typing; return concise, consistent error shapes.

## Endpoints (Hono)

Mounted under the CMS app when `config.auth` is present. When used with Next.js via the catch-all handler, these live under `/api`.

- `POST /auth/sign-in` — body: `{ email, password }`
- `POST /auth/sign-up` — body: `{ email, password, name }`
- `POST /auth/sign-out` — signs out the current user
- `GET  /auth/signout` — sign-out alias for anchor links
- `GET  /auth/session` — returns `{ user, session } | { user: null, session: null }`
- Optional:
  - `POST /auth/password/forgot` — body: `{ email }`
  - `POST /auth/password/reset` — body: `{ token, newPassword }`
  - `POST /auth/email/verify` — body: `{ token }`

Responses:
- Success: JSON with `user` and `session` where applicable
- Errors: `{ error: string }` with appropriate status

## Middleware & Helpers

- `resolveAuthFromCookie(cms, cookieHeader)` — returns `{ user?, session? }`
- `honoOptionalAuth(c)` — resolves auth context from request cookies
- `honoRequireAuth(c)` — throws a 401 response if no user

Usage in handlers:
```ts
import { honoOptionalAuth, honoRequireAuth } from '@tiny-cms/core/routes/auth.middleware'

app.get('/collections/:collection', async (c) => {
  const { user } = await honoOptionalAuth(c)
  // ...
})

app.post('/collections/:collection', async (c) => {
  const { user } = await honoRequireAuth(c)
  // ...
})
```

## Next.js Integration

The `@tiny-cms/next` package provides cookie-only helpers:
- `getServerAuth(cms)` — returns `{ user, session } | null`
- `requireServerAuth(cms)` — throws if not authenticated
- `authorize(cms)` — alias for `requireServerAuth`
- `withServerAuth(cms, handler)` — wrapper for server actions

Example in a Server Component:
```ts
import { authorize } from '@tiny-cms/next'

export default async function AdminPage() {
  const cms = getCMS()
  const { user } = await authorize(cms)
  // ...
}
```

## Notes
- Cookies should be `httpOnly`, `secure` in production, `sameSite=lax`.
- Access control should be enforced at collection level; route-level `requireAuth` is applied to mutating routes by default in core.
- Avoid duplicating auth logic in integrations; always delegate to core.
