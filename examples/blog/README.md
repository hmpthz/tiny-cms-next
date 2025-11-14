# Tiny-CMS Blog Example

A complete blog application demonstrating tiny-cms features including authentication, collections, access control, and hooks.

## Features Demonstrated

- ✅ **Three Collections**: users, posts, categories
- ✅ **Better-Auth Integration**: Email/password authentication
- ✅ **Role-Based Access Control**: admin, author, user roles
- ✅ **Field Types**: text, email, select, checkbox, date, relation, richtext
- ✅ **Hooks**: Auto-slug generation, auto-set author, publish date handling
- ✅ **Relationship Fields**: Post → Author, Post → Category
- ✅ **Access Control Patterns**: Public reads, role-based writes
- ✅ **API Routes**: Full CRUD operations
- ✅ **Plugin-Ready**: Optional plugins can add API routes and SDK methods (e.g., `@tiny-cms/plugin-storage` adds `/storage/*` and client upload helpers)

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
```

### 5. Create Schema

The schema builder will create all necessary tables:

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

````
examples/blog/
├─ app/
│  ├─ api/
│  │  └─ [[...route]]/route.ts   # Catch-all API → Hono app
│  ├─ admin/[...slug]/           # Admin UI routes
│  ├─ posts/[slug]/page.tsx      # Post page
│  └─ page.tsx                   # Home page
├─ lib/
│  └─ cms.ts                     # CMS configuration (TinyCMS + auth)
├─ scripts/
│  └─ push-schema.ts             # Database schema setup
├─ .env.example
├─ package.json
└─ README.md
```## Collections

### Users Collection

```typescript
{
  name: 'users',
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'select', options: ['admin', 'author', 'user'] },
  ],
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc?.id || user?.role === 'admin',
    delete: ({ user }) => user?.role === 'admin',
  },
}
````

### Posts Collection

```typescript
{
  name: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'excerpt', type: 'text' },
    { name: 'content', type: 'richtext', required: true },
    { name: 'author', type: 'relation', to: 'users', required: true },
    { name: 'category', type: 'relation', to: 'categories' },
    { name: 'published', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date' },
  ],
  access: {
    read: ({ user }) => user ? true : { published: true },
    create: ({ user }) => ['admin', 'author'].includes(user?.role || ''),
    update: ({ user, doc }) => user?.role === 'admin' || user?.id === doc?.author,
    delete: ({ user }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: async ({ data, context }) => {
      // Auto-generate slug
      if (!data.slug && data.title) {
        data.slug = slugify(data.title)
      }
      // Set publishedAt on publish
      if (data.published && !data.publishedAt) {
        data.publishedAt = new Date()
      }
      // Auto-set author
      if (context.operation === 'create' && context.user) {
        data.author = context.user.id
      }
      return data
    },
  },
}
```

### Categories Collection

```typescript
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

## API Endpoints

### Authentication

Better-auth automatically provides these endpoints:

- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-up` - Sign up
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get session

### Collections

**Posts:**

- `GET /api/collections/posts` - List posts
- `POST /api/collections/posts` - Create post
- `GET /api/collections/posts/:id` - Get post
- `PATCH /api/collections/posts/:id` - Update post
- `DELETE /api/collections/posts/:id` - Delete post

**Categories:**

- `GET /api/collections/categories` - List categories
- `POST /api/collections/categories` - Create category
- `GET /api/collections/categories/:id` - Get category
- `PATCH /api/collections/categories/:id` - Update category
- `DELETE /api/collections/categories/:id` - Delete category

**Users:**

- `GET /api/collections/users` - List users
- `GET /api/collections/users/:id` - Get user
- `PATCH /api/collections/users/:id` - Update user

## Example API Usage

### Create a Post

```bash
# Sign up first
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "author@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# Create a post
curl -X POST http://localhost:3000/api/collections/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "title": "My First Post",
    "content": "This is the content",
    "published": true
  }'
```

### List Published Posts

```bash
curl "http://localhost:3000/api/collections/posts?where=%7B%22published%22%3Atrue%7D&limit=10"
```

### Update a Post

```bash
curl -X PATCH http://localhost:3000/api/collections/posts/UUID \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "title": "Updated Title",
    "published": true
  }'
```

## Database Schema

### Posts Table

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  author UUID NOT NULL,
  category UUID,
  tags JSONB,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_author ON posts(author);
CREATE INDEX idx_posts_category ON posts(category);
```

## Access Control Examples

### Public Can Read Published Posts

```typescript
read: ({ user }) => {
  if (user) return true // Authenticated sees all
  return { published: true } // Public sees only published
}
```

### Authors Can Edit Their Own Posts

```typescript
update: ({ user, doc }) => {
  if (user?.role === 'admin') return true
  return user?.id === doc?.author
}
```

### Only Admins Can Delete

```typescript
delete: ({ user }) => user?.role === 'admin'
```

## Hooks Examples

### Auto-Generate Slug

```typescript
beforeChange: async ({ data }) => {
  if (!data.slug && data.title) {
    data.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
  return data
}
```

### Auto-Set Author on Create

```typescript
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

Set these in your production environment:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?ssl=true
AUTH_SECRET=your-production-secret-32-chars-minimum
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

### Database Migration

Run schema builder in production:

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

```
Error: Connection terminated unexpectedly
```

**Solution:** Check your DATABASE_URL and ensure PostgreSQL is running.

### Auth Errors

```
Error: Authentication is not configured
```

**Solution:** Ensure AUTH_SECRET is set and better-auth is properly configured.

### Schema Errors

```
Error: Table does not exist
```

**Solution:** Run `pnpm db:push` to create tables.

## Next Steps

1. **Add Admin UI**: Build an admin panel with shadcn/ui components
2. **Add File Uploads**: Enable `@tiny-cms/plugin-storage` (S3‑compatible). The bundled Supabase adapter is one implementation.
3. **Add Search**: Implement PostgreSQL full-text search
4. **Add Rich Text Editor**: Integrate a markdown or WYSIWYG editor
5. **Add Email**: Configure better-auth email verification

## Learn More

- [Tiny-CMS Documentation](../../README.md)
- [@tiny-cms/core](../../packages/core/README.md)
- [@tiny-cms/db-postgres](../../packages/db-postgres/README.md)
- [@tiny-cms/next](../../packages/next/README.md)
- [Better-Auth Documentation](https://better-auth.com)
- [Kysely Documentation](https://kysely.dev)

## License

MIT
