# Collections, Fields, Hooks, and Access Control

Collections are the core building block of `@tiny-cms/core`. A collection describes:
- the shape of documents (via fields),
- how documents should be validated,
- hooks that run around operations, and
- access control rules.

This document covers everything you need to configure collections in core.

## Defining collections

Collections are configured on the root CMS config:

```ts
import { defineConfig } from '@tiny-cms/core'

export const config = defineConfig({
  db: myDatabaseAdapter,
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
```

Under the hood, collections are represented by the `Collection` type:

```ts
interface Collection {
  name: string
  slug?: string
  fields: Field[]
  access?: AccessControl
  hooks?: CollectionHooks
  timestamps?: boolean
  softDelete?: boolean
  labels?: {
    singular?: string
    plural?: string
  }
  indexes?: CollectionIndex[]
}
```

- `name` – logical name and default table identifier.
- `slug` – optional alternative identifier (adapters may use it as the physical table name).
- `fields` – array of field definitions (see below).
- `access` – per‑operation access control functions.
- `hooks` – lifecycle hooks for create/read/update.
- `timestamps` / `softDelete` / `indexes` – metadata that adapters and tooling can use when building schemas.

All documents in a collection share a common base shape:

```ts
interface Document {
  id: string
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
  [key: string]: unknown
}
```

## Field types and validation

Fields describe what can be stored in each document. Core keeps the set intentionally small and validates
values at runtime using Zod.

All fields extend `BaseField`:

```ts
interface BaseField {
  name: string
  label?: string
  required?: boolean
  unique?: boolean
  defaultValue?: unknown
  admin?: {
    hidden?: boolean
    readOnly?: boolean
    description?: string
  }
}
```

Core field types:

- `TextField` – `{ type: 'text'; minLength?; maxLength? }`
- `NumberField` – `{ type: 'number'; min?; max?; step? }`
- `EmailField` – `{ type: 'email' }`
- `SelectField` – `{ type: 'select'; options; multiple? }`
- `CheckboxField` – `{ type: 'checkbox' }`
- `DateField` – `{ type: 'date'; time?: boolean }`
- `RelationField` – `{ type: 'relation'; to: string; multiple?: boolean }`
- `RichTextField` – `{ type: 'richtext' }`

Core converts field definitions into a Zod schema via `fieldToZodSchema` and `collectionToZodSchema`.
Validation is applied automatically by the CMS:

- `create`:
  - runs `beforeChange` hooks (if any),
  - validates the resulting data via `validateData(fields, data)`,
  - writes the validated data to the database.

- `update`:
  - loads the existing document,
  - runs `beforeChange` on the incoming patch,
  - validates the merged document (`{ ...existingDoc, ...patchedData }`),
  - persists the patch if validation succeeds.

Validation errors are surfaced as thrown errors containing all field messages, which are then turned into
`{ error: string }` responses in the HTTP layer.

You can also reuse the same validation primitives directly:

```ts
import { fieldToZodSchema, collectionToZodSchema, validateData } from '@tiny-cms/core'
```

This is useful for building forms or migration tooling that should mirror core’s rules.

## Hooks: before/after change and before read

Hooks let you run custom logic around collection operations while keeping core data flow predictable.
They are defined on the collection as:

```ts
interface CollectionHooks {
  beforeChange?: BeforeChangeHook
  afterChange?: AfterChangeHook
  beforeRead?: BeforeReadHook
}
```

Each hook receives a `HookContext`:

```ts
interface HookContext {
  collection: string
  operation: 'create' | 'update' | 'delete' | 'find' | 'findById'
  user?: { id: string; email: string; role?: string; [key: string]: unknown }
  originalDoc?: Record<string, unknown> // for update
}
```

Hook behavior:

- `beforeChange`
  - runs before validation for both `create` and `update`,
  - receives `{ data, context }`,
  - can mutate or enrich data by returning a new object,
  - is chained with validation (`validateData` always sees the transformed data).

- `afterChange`
  - runs after `create` and `update` once the document is persisted,
  - receives `{ doc, context, previousDoc? }`,
  - is typically used for side‑effects (logging, search indexing, notifications).

- `beforeRead`
  - runs on each document returned by `find` and `findById`,
  - receives `{ doc, context }`,
  - can shape the response (e.g. strip fields or denormalize relations).

Example: audit trail hook applied to a collection:

```ts
const postsCollection = {
  name: 'posts',
  fields: [...],
  hooks: {
    afterChange: async ({ doc, context, previousDoc }) => {
      console.log(
        `User ${context.user?.email ?? 'anonymous'} changed document ${doc.id} in ${context.collection}`,
        { before: previousDoc, after: doc },
      )
    },
  },
}
```

Because hooks run inside the CMS methods (not in the HTTP layer), they fire regardless of how operations
are invoked (via routes, SDK, or direct method calls).

## Access control

Access control is defined per collection and per operation via functions that receive rich context:

```ts
interface AccessContext {
  user?: { id: string; email: string; role?: string; [key: string]: unknown }
  data?: Record<string, unknown> // create/update payload
  doc?: Record<string, unknown>  // existing doc for update/delete
}

type AccessResult = boolean | Where

interface AccessControl {
  create?: AccessFunction
  read?: AccessFunction
  update?: AccessFunction
  delete?: AccessFunction
}
```

Core interprets access results as follows:

- For `create`, `update`, and `delete`:
  - if the function is not defined, the operation is allowed,
  - if it returns `false`, the operation throws an `Access denied` error,
  - any other value is treated as “allowed”.

- For `read` (used by both `find` and `findById`/`count`):
  - if the function is not defined, reads are allowed,
  - if it returns `false`, reads throw an `Access denied` error,
  - if it returns a `Where` object, it is merged into the query:
    - `find` / `count` combine existing `where` with access constraints using `AND`,
    - `findById` can use these constraints when implemented by adapters.

Example: simple role‑based access rules:

```ts
const posts: Collection = {
  name: 'posts',
  fields: [...],
  access: {
    read: () => true, // everyone can read
    create: ({ user }) => !!user && user.role === 'editor',
    update: ({ user, doc }) => !!user && user.role === 'editor' && doc?.authorId === user.id,
    delete: ({ user }) => !!user && user.role === 'admin',
  },
}
```

Example: row‑level read restrictions by returning a `Where` clause:

```ts
const comments: Collection = {
  name: 'comments',
  fields: [...],
  access: {
    read: ({ user }) => {
      if (!user) return false
      // User can only see their own comments
      return { authorId: { equals: user.id } }
    },
  },
}
```

These rules are enforced inside the `TinyCMS` methods and are therefore shared by:
- HTTP handlers (default use‑case),
- any custom routes that call CMS methods, and
- direct programmatic usage (`cms.create`, `cms.update`, etc.).

## Indexes, timestamps, and soft delete

The collection type exposes a few additional properties intended for database adapters and tooling:

- `indexes?: CollectionIndex[]` – hints about which fields should be indexed.
- `timestamps?: boolean` – flags whether `createdAt` / `updatedAt` should be automatically managed.
- `softDelete?: boolean` – indicates that `deletedAt` should be used instead of hard deletes.

Core itself does not currently manipulate these fields; they are preserved on the collection config
so adapters, migrations, and plugins can implement the desired behavior consistently.

