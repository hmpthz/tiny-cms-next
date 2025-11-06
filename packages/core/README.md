# @tiny-cms/core

Core CMS logic for tiny-cms providing collections, CRUD operations, validation, hooks, access control, and authentication integration.

## Installation

```bash
pnpm add @tiny-cms/core
```

## Quick Start

```typescript
import { createCMS, defineConfig } from '@tiny-cms/core'
import { postgresAdapter } from '@tiny-cms/db'

const config = defineConfig({
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
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

const cms = await createCMS(config)

// Create a post
const post = await cms.create('posts', {
  title: 'Hello World',
  content: 'My first post',
})

// Find posts
const { docs } = await cms.find('posts', {
  where: { published: true },
  limit: 10,
})
```

## API Reference

### createCMS(config)

Creates and initializes a CMS instance.

```typescript
const cms = await createCMS(config)
```

### defineConfig(config)

Type-safe config helper.

```typescript
const config = defineConfig({
  db: DatabaseAdapter,
  collections: Collection[],
  auth?: AuthConfig,
  storage?: StorageAdapter,
  secret?: string,
  serverURL?: string,
})
```

## Field Types

### TextField

```typescript
{ name: 'title', type: 'text', required?: boolean, minLength?: number, maxLength?: number }
```

### NumberField

```typescript
{ name: 'price', type: 'number', required?: boolean, min?: number, max?: number }
```

### EmailField

```typescript
{ name: 'email', type: 'email', required?: boolean }
```

### SelectField

```typescript
{
  name: 'status',
  type: 'select',
  options: ['draft', 'published'],
  multiple?: boolean
}
```

### CheckboxField

```typescript
{ name: 'published', type: 'checkbox', defaultValue?: boolean }
```

### DateField

```typescript
{ name: 'publishedAt', type: 'date', time?: boolean }
```

### RelationField

```typescript
{ name: 'author', type: 'relation', to: 'users', multiple?: boolean }
```

### RichTextField

```typescript
{ name: 'content', type: 'richtext' }
```

## CRUD Operations

### create(collection, data, user?)

Create a new document.

```typescript
const doc = await cms.create(
  'posts',
  {
    title: 'New Post',
    content: 'Content here',
  },
  currentUser,
)
```

### find(collection, options?, user?)

Find documents with filtering, sorting, pagination.

```typescript
const result = await cms.find(
  'posts',
  {
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    limit: 10,
    offset: 0,
  },
  currentUser,
)

console.log(result.docs) // Array of documents
console.log(result.totalDocs) // Total count
console.log(result.hasNextPage) // Pagination info
```

### findById(collection, id, user?)

Find a document by ID.

```typescript
const doc = await cms.findById('posts', 'uuid-here', currentUser)
```

### update(collection, id, data, user?)

Update a document.

```typescript
const doc = await cms.update(
  'posts',
  'uuid-here',
  {
    title: 'Updated Title',
  },
  currentUser,
)
```

### delete(collection, id, user?)

Delete a document.

```typescript
await cms.delete('posts', 'uuid-here', currentUser)
```

### count(collection, options?, user?)

Count documents.

```typescript
const count = await cms.count(
  'posts',
  {
    where: { published: true },
  },
  currentUser,
)
```

## Access Control

Function-based permissions with boolean or where query return:

```typescript
{
  name: 'posts',
  access: {
    // Return true/false for all-or-nothing
    create: ({ user }) => !!user,

    // Return where query for row-level security
    read: ({ user }) => {
      if (user) return true
      return { published: true }
    },

    // Access user and document data
    update: ({ user, doc }) => {
      if (user?.role === 'admin') return true
      return user?.id === doc?.author
    },

    delete: ({ user }) => user?.role === 'admin',
  }
}
```

**Access Context:**

- `user` - Current authenticated user
- `data` - Data being created/updated
- `doc` - Existing document (for update/delete)

## Hooks

Customize behavior at key execution points:

```typescript
{
  name: 'posts',
  hooks: {
    beforeChange: async ({ data, context }) => {
      // Transform data before validation & save
      if (!data.slug) {
        data.slug = slugify(data.title)
      }
      if (context.operation === 'create') {
        data.author = context.user?.id
      }
      return data
    },

    afterChange: async ({ doc, context, previousDoc }) => {
      // Side effects after save
      console.log('Post saved:', doc.id)
      await revalidatePath(`/posts/${doc.slug}`)
    },

    beforeRead: async ({ doc, context }) => {
      // Transform data before returning
      return doc
    },
  }
}
```

**Hook Context:**

- `collection` - Collection name
- `operation` - 'create' | 'update' | 'delete' | 'find' | 'findById'
- `user` - Current user
- `originalDoc` - Original document (for update)

## Authentication

Integrate better-auth for authentication:

```typescript
import { betterAuth } from 'better-auth'
import { createAuthWrapper } from '@tiny-cms/core'

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
})

const config = defineConfig({
  auth: {
    operations: createAuthWrapper(auth),
    config: {
      enabled: true,
      requireEmailVerification: false,
      roles: ['admin', 'author', 'user'],
      defaultRole: 'user',
    },
  },
  collections: [
    /* ... */
  ],
})

// Access auth operations
const cms = await createCMS(config)
await cms.auth.signIn(email, password)
await cms.auth.signUp(email, password, name)
await cms.auth.signOut()
const session = await cms.auth.getSession(headers)
```

## Validation

Automatic validation using Zod schemas generated from field definitions:

```typescript
// Validation happens automatically in create/update
const doc = await cms.create('posts', {
  title: '', // ❌ Fails: required
  content: 123, // ❌ Fails: wrong type
})

// Manual validation
import { validateData } from '@tiny-cms/core'

const result = await validateData(collection.fields, data)
if (!result.success) {
  console.error(result.errors)
}
```

## TypeScript

Full type safety with TypeScript:

```typescript
import type { Collection, Field, Config } from '@tiny-cms/core'

const PostsCollection: Collection = {
  name: 'posts',
  fields: [
    /* ... */
  ],
}
```

## License

MIT
