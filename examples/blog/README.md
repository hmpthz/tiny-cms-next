# Tiny-CMS Blog Example

A complete blog application demonstrating tiny-cms features including authentication, collections, access control, and hooks.

## Features Demonstrated

- ✅ **Three Collections**: users, posts, categories
- ✅ **Better-Auth Integration**: email/password authentication
- ✅ **Role-Based Access Control**: admin, author, user roles
- ✅ **Field Types**: text, email, select, checkbox, date, relation, richtext
- ✅ **Hooks**: auto-slug generation, auto-set author, publish date handling
- ✅ **Relationship Fields**: Post → Author, Post → Category
- ✅ **Access Control Patterns**: public reads, role-based writes
- ✅ **API Routes**: full CRUD operations via the Hono app
- ✅ **Plugin-Ready**: optional plugins can add API routes and SDK methods (e.g., `@tiny-cms/plugin-storage` adds `/storage/*` and client upload helpers)

## Quick Start

### 1. Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 14+ database

### 2. Install Dependencies

```bash
# From root directory
pnpm install

# Build packages
pnpm -r build
```

### 3. Setup Database

```bash
# Create database
createdb tiny_cms_blog

# Or using psql
psql -U postgres
CREATE DATABASE tiny_cms_blog;
\q
```

### 4. Configure Environment

```bash
cd examples/blog
cp .env.example .env
```

Edit `.env`:

```bash
# PostgreSQL connection
DATABASE_URL=postgresql://user:password@localhost:5432/tiny_cms_blog

# Auth secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-super-secret-key-here

# Next.js URL
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Create Schema

```bash
pnpm db:push
```

This creates:

- `users` table
- `posts` table
- `categories` table
- Better-auth tables (`user`, `session`, `verification`)

### 6. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000

## Project Structure

```text
examples/blog/
  app/
    api/[[...route]]/route.ts   # Catch-all API → Hono app
    admin/[...slug]/page.tsx    # Admin UI entry (RootAdminPage)
    posts/[slug]/page.tsx       # Post page
    posts/page.tsx              # All posts listing
    categories/[slug]/page.tsx  # Category page
    sign-in/page.tsx            # Standalone sign-in route
    page.tsx                    # Home page
  lib/
    cms.ts                      # CMS configuration (TinyCMS + auth)
  scripts/
    push-schema.ts              # Database schema setup
  .env.example
  package.json
  README.md
```

## Admin UI and Auth

This example wires the core/Next integration to `@tiny-cms/admin-ui`:

- `app/admin/[...slug]/page.tsx` uses `RootAdminPage` from `@tiny-cms/next/admin`.
- The page creates a `TinyCmsSDK` instance and passes it via `AdminSdkProvider` from `@tiny-cms/admin-ui`.
- `RootAdminPage` runs on the server, parses the admin route, loads initial data with `TinyCMS`, and exposes server actions for CRUD operations.
- All admin views (dashboard, list, create, edit, account, sign-in) are rendered by `@tiny-cms/admin-ui` client components.

Authentication is cookie-only via better-auth:

- `/api/*` is backed by the Hono app created by `TinyCMS` (auth routes live under `/auth/*`).
- `@tiny-cms/next` exports `getServerAuth`, `requireServerAuth`, and `withServerAuth` to use cookies in server components and actions.
- `/sign-in` is a standalone sign-in page that:
  - Redirects to `/admin` (or `?redirect=/path`) if the user is already signed in.
  - Otherwise renders `SignInPage` from `@tiny-cms/admin-ui`, which posts to `/api/auth/sign-in` and relies on cookies set by the Hono auth controller.

## Collections

### Users Collection

```ts
{
  name: 'users',
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'author', 'user'],
    },
  ],
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc?.id || user?.role === 'admin',
    delete: ({ user }) => user?.role === 'admin',
  },
}
```

### Posts Collection

```ts
{
  name: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'excerpt', type: 'text' },
    { name: 'content', type: 'richtext', required: true },
    { name: 'featuredImage', type: 'relation', to: 'media' },
    { name: 'author', type: 'relation', to: 'users', required: true },
    { name: 'category', type: 'relation', to: 'categories' },
    { name: 'tags', type: 'select', options: [], multiple: true },
    { name: 'published', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date' },
  ],
  access: {
    read: ({ user }) => {
      if (user) return true
      return { published: true }
    },
    create: ({ user }) => ['admin', 'author'].includes(user?.role || ''),
    update: ({ user, doc }) => {
      if (user?.role === 'admin') return true
      return user?.id === doc?.author
    },
    delete: ({ user }) => user?.role === 'admin',
  },
}
```

### Categories Collection

```ts
{
  name: 'categories',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'text' },
  ],
  access: {
    read: () => true,
    create: ({ user }) => user?.role === 'admin',
    update: ({ user }) => user?.role === 'admin',
    delete: ({ user }) => user?.role === 'admin',
  },
}
```

## Hooks Examples

### Auto-Generate Slug

```ts
beforeChange: async ({ data }) => {
  if (!data.slug && data.title) {
    data.slug = (data.title as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
  return data
}
```

### Auto-Set Author on Create

```ts
beforeChange: async ({ data, context }) => {
  if (context.operation === 'create' && context.user && !data.author) {
    data.author = context.user.id
  }
  return data
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Run dev server
pnpm dev

# Rebuild schema
pnpm db:push

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Production Deployment

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?ssl=true
AUTH_SECRET=your-production-secret-32-chars-minimum
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NODE_ENV=production
```

### Database Migration

```bash
NODE_ENV=production pnpm db:push
```

### Build

```bash
pnpm build
pnpm start
```

## Troubleshooting

### Database Connection Errors

```text
Error: Connection terminated unexpectedly
```

**Solution:** Check your `DATABASE_URL` and ensure PostgreSQL is running.

### Auth Errors

```text
Error: Authentication is not configured
```

**Solution:** Ensure `AUTH_SECRET` is set and better-auth is properly configured.

### Schema Errors

```text
Error: Table does not exist
```

**Solution:** Run `pnpm db:push` to create tables.

## Next Steps

1. **Customize Admin UI**: Replace or extend the prefab `@tiny-cms/admin-ui` pages.
2. **Add File Uploads**: Enable `@tiny-cms/plugin-storage` (S3-compatible). The bundled Supabase adapter is one implementation.
3. **Add Search**: Implement PostgreSQL full-text search.
4. **Enhance Rich Text**: Swap the simple markdown textarea/preview for a richer editor.
5. **Add Email**: Configure better-auth email verification and password reset flows.

## Learn More

- [Tiny-CMS Documentation](../../README.md)
- [@tiny-cms/core](../../packages/core/README.md)
- [@tiny-cms/db-postgres](../../packages/db-postgres/README.md)
- [@tiny-cms/next](../../packages/next/README.md)
- [Better-Auth Documentation](https://better-auth.com)
- [Kysely Documentation](https://kysely.dev)

## License

MIT

