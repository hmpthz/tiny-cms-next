# Payload SDK Package - Detailed Analysis Report

**Analysis Date:** October 14, 2025
**Package Version:** 3.59.1
**Package Location:** `packages/sdk`
**Purpose:** Type-safe REST API client for Payload CMS

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Package Overview](#package-overview)
3. [Directory Structure](#directory-structure)
4. [Dependencies and Build Configuration](#dependencies-and-build-configuration)
5. [SDK Architecture](#sdk-architecture)
6. [Type System Deep Dive](#type-system-deep-dive)
7. [Core Features and Implementation](#core-features-and-implementation)
8. [Collections API](#collections-api)
9. [Globals API](#globals-api)
10. [Authentication API](#authentication-api)
11. [Versions Management](#versions-management)
12. [File Upload Handling](#file-upload-handling)
13. [Request/Response Handling](#requestresponse-handling)
14. [Error Handling Patterns](#error-handling-patterns)
15. [Integration Patterns](#integration-patterns)
16. [What We Need for tiny-cms](#what-we-need-for-tiny-cms)
17. [Simplification Opportunities](#simplification-opportunities)
18. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The Payload SDK is a **type-safe REST API client** that provides a fully typed interface to interact with Payload CMS backends. It mirrors the Payload Local API but works over HTTP, making it ideal for frontend applications, serverless functions, and external integrations.

**Key Characteristics:**

- **100% Type-Safe**: Uses TypeScript generics to provide compile-time type safety
- **Minimal Dependencies**: Only 3 runtime dependencies (payload, qs-esm, ts-essentials)
- **Clean Architecture**: Well-organized with clear separation of concerns
- **24 Source Files**: ~2,500 lines of code (LOC) total
- **Comprehensive Coverage**: Supports all CRUD operations, auth, versions, and file uploads

**Essential Features for tiny-cms:**

- Collections CRUD (find, findByID, create, update, delete)
- Authentication (login, me, refresh)
- File uploads for media handling
- Type-safe query building

---

## Package Overview

**Location:** `payload-main/packages/sdk/`

### Basic Information

```json
{
  "name": "@payloadcms/sdk",
  "version": "3.59.1",
  "description": "The official Payload REST API SDK",
  "type": "module",
  "license": "MIT"
}
```

### Entry Points

**Development Entry:**

```javascript
// packages/sdk/src/index.ts
export { PayloadSDK } from './index.js'
```

**Production Entry (after build):**

```javascript
// packages/sdk/dist/index.js
// Compiled from TypeScript with SWC
```

### Package Exports Configuration

```json
{
  "exports": {
    ".": {
      "import": "./src/index.ts", // Development
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "publishConfig": {
    "exports": {
      ".": {
        "import": "./dist/index.js", // Production
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
  }
}
```

---

## Directory Structure

```
sdk/src/
├── index.ts                      # Main SDK class and exports
├── types.ts                      # Core type definitions
├── collections/                  # Collection operations (9 files)
│   ├── find.ts                  # Query multiple documents
│   ├── findByID.ts              # Query single document
│   ├── create.ts                # Create document
│   ├── update.ts                # Update document(s)
│   ├── delete.ts                # Delete document(s)
│   ├── count.ts                 # Count documents
│   ├── findVersions.ts          # Query version history
│   ├── findVersionByID.ts       # Get specific version
│   └── restoreVersion.ts        # Restore version
├── globals/                      # Global operations (5 files)
│   ├── findOne.ts               # Get global data
│   ├── update.ts                # Update global data
│   ├── findVersions.ts          # Query global versions
│   ├── findVersionByID.ts       # Get specific global version
│   └── restoreVersion.ts        # Restore global version
├── auth/                         # Authentication operations (6 files)
│   ├── login.ts                 # User login
│   ├── me.ts                    # Get current user
│   ├── refreshToken.ts          # Refresh JWT token
│   ├── forgotPassword.ts        # Password reset request
│   ├── resetPassword.ts         # Reset password with token
│   └── verifyEmail.ts           # Email verification
└── utilities/                    # Helper functions (2 files)
    ├── buildSearchParams.ts     # Query string builder
    └── resolveFileFromOptions.ts # File handling utility
```

**File Distribution:**

- Collections: 9 files (37.5%)
- Globals: 5 files (20.8%)
- Auth: 6 files (25%)
- Utilities: 2 files (8.3%)
- Core: 2 files (8.3%)

---

## Dependencies and Build Configuration

### Runtime Dependencies

```json
{
  "dependencies": {
    "payload": "workspace:*", // Core Payload types
    "qs-esm": "7.0.2", // Query string serialization
    "ts-essentials": "10.0.3" // TypeScript utility types
  }
}
```

**Dependency Analysis:**

1. **payload** (workspace dependency)
   - Provides core type definitions
   - Required for: `PaginatedDocs`, `Where`, `Sort`, `SelectType`, etc.

2. **qs-esm** (7.0.2)
   - ESM-compatible query string library
   - Used in: `buildSearchParams.ts`
   - Purpose: Serializes complex query objects to URL parameters

3. **ts-essentials** (10.0.3)
   - TypeScript utility types
   - Used types: `DeepPartial`, `MarkOptional`, `NonNever`
   - Purpose: Advanced type transformations

### Build Configuration

**TypeScript Config (tsconfig.json):**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "noEmit": false,
    "emitDeclarationOnly": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [{ "path": "../payload" }]
}
```

**SWC Config (.swcrc):**

```json
{
  "jsc": {
    "parser": { "syntax": "typescript" },
    "target": "es2022"
  },
  "module": { "type": "es6" }
}
```

**Build Scripts:**

```json
{
  "scripts": {
    "build": "pnpm copyfiles && pnpm build:types && pnpm build:swc",
    "build:swc": "swc ./src -d ./dist --config-file .swcrc --strip-leading-paths",
    "build:types": "tsc --emitDeclarationOnly --outDir dist"
  }
}
```

**Build Process:**

1. Copy static files (copyfiles)
2. Generate `.d.ts` files (TypeScript)
3. Transpile to JavaScript (SWC)

---

## SDK Architecture

### Core Class Structure

The SDK is built around a single main class `PayloadSDK` with type-safe method delegation.

**Main Class Definition (packages/sdk/src/index.ts):**

```typescript
export class PayloadSDK<T extends PayloadGeneratedTypes = PayloadGeneratedTypes> {
  baseInit: RequestInit
  baseURL: string
  fetch: typeof fetch

  constructor(args: Args) {
    this.baseURL = args.baseURL
    this.fetch = args.fetch ?? globalThis.fetch.bind(globalThis)
    this.baseInit = args.baseInit ?? {}
  }

  // Collection methods
  find<TSlug, TSelect>(options, init?): Promise<PaginatedDocs<...>>
  findByID<TSlug, TDisableErrors, TSelect>(options, init?): Promise<...>
  create<TSlug, TSelect>(options, init?): Promise<...>
  update<TSlug, TSelect>(options, init?): Promise<...>
  delete<TSlug, TSelect>(options, init?): Promise<...>
  count<TSlug>(options, init?): Promise<{ totalDocs: number }>

  // Global methods
  findGlobal<TSlug, TSelect>(options, init?): Promise<...>
  updateGlobal<TSlug, TSelect>(options, init?): Promise<...>

  // Auth methods
  login<TSlug>(options, init?): Promise<LoginResult<T, TSlug>>
  me<TSlug>(options, init?): Promise<MeResult<T, TSlug>>
  refreshToken<TSlug>(options, init?): Promise<RefreshResult<T, TSlug>>
  forgotPassword<TSlug>(options, init?): Promise<{ message: string }>
  resetPassword<TSlug>(options, init?): Promise<ResetPasswordResult<T, TSlug>>
  verifyEmail<TSlug>(options, init?): Promise<{ message: string }>

  // Version methods
  findVersions<TSlug>(options, init?): Promise<PaginatedDocs<...>>
  findVersionByID<TSlug, TDisableErrors>(options, init?): Promise<...>
  restoreVersion<TSlug>(options, init?): Promise<...>
  findGlobalVersions<TSlug>(options, init?): Promise<PaginatedDocs<...>>
  findGlobalVersionByID<TSlug, TDisableErrors>(options, init?): Promise<...>
  restoreGlobalVersion<TSlug>(options, init?): Promise<...>

  // Low-level request method
  async request({
    args,
    file,
    init,
    json,
    method,
    path
  }): Promise<Response>
}
```

### Constructor Arguments

```typescript
type Args = {
  /** Base API URL for requests */
  baseURL: string

  /** Base RequestInit passed to all fetch calls */
  baseInit?: RequestInit

  /** Custom fetch implementation */
  fetch?: typeof fetch
}
```

**Usage Example:**

```typescript
const sdk = new PayloadSDK<GeneratedTypes>({
  baseURL: 'https://example.com/api',
  baseInit: {
    credentials: 'include',
    headers: {
      'X-Custom-Header': 'value',
    },
  },
})
```

### Design Patterns

**1. Method Delegation Pattern**

Each SDK method delegates to a standalone function:

```typescript
// In PayloadSDK class
find<TSlug, TSelect>(options, init?) {
  return find(this, options, init)
}

// In packages/sdk/src/collections/find.ts
export async function find<T, TSlug, TSelect>(
  sdk: PayloadSDK<T>,
  options: FindOptions<T, TSlug, TSelect>,
  init?: RequestInit
): Promise<PaginatedDocs<TransformCollectionWithSelect<T, TSlug, TSelect>>> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'GET',
    path: `/${options.collection}`
  })
  return response.json()
}
```

**Why this pattern?**

- Easier to test individual functions
- Better code organization
- Each operation in its own file
- Avoids massive class file

**2. Generic Type Propagation**

Type safety flows from SDK initialization through to results:

```typescript
// Step 1: Initialize with your config types
import type { Config } from './payload-types'
const sdk = new PayloadSDK<Config>({ ... })

// Step 2: TypeScript infers collection types
const posts = await sdk.find({
  collection: 'posts',  // ← Autocomplete shows valid collections
  where: {
    title: {              // ← Autocomplete shows 'posts' fields
      equals: 'Hello'
    }
  }
})

// Step 3: Result is properly typed
posts.docs[0].title  // ← TypeScript knows this is a string
```

**3. Overload Pattern for Flexibility**

Methods like `update` and `delete` support both single-document and bulk operations:

```typescript
// Overload signatures
update<TSlug, TSelect>(
  options: UpdateManyOptions<T, TSlug, TSelect>
): Promise<BulkOperationResult<T, TSlug, TSelect>>

update<TSlug, TSelect>(
  options: UpdateByIDOptions<T, TSlug, TSelect>
): Promise<TransformCollectionWithSelect<T, TSlug, TSelect>>

// Implementation handles both cases
update<TSlug, TSelect>(
  options: UpdateOptions<T, TSlug, TSelect>
): Promise<BulkOperationResult | TransformCollectionWithSelect> {
  return update(this, options, init)
}
```

---

## Type System Deep Dive

The SDK's type system is sophisticated and ensures end-to-end type safety.

### Core Type Definitions (packages/sdk/src/types.ts)

**1. PayloadGeneratedTypes Interface**

This is the contract that generated types must implement:

```typescript
export interface PayloadGeneratedTypes {
  // Collection definitions
  collections: {
    [slug: string]: JsonObject & TypeWithID
  }

  // Collection select types (for field selection)
  collectionsSelect: {
    [slug: string]: any
  }

  // Collection join configurations
  collectionsJoins: {
    [slug: string]: {
      [schemaPath: string]: string
    }
  }

  // Global definitions
  globals: {
    [slug: string]: JsonObject
  }

  // Global select types
  globalsSelect: {
    [slug: string]: any
  }

  // Auth collection configurations
  auth: {
    [slug: string]: {
      forgotPassword: { email: string }
      login: { email: string; password: string }
      registerFirstUser: { email: string; password: string }
      unlock: { email: string }
    }
  }

  // Database ID type (string | number)
  db: {
    defaultIDType: number | string
  }

  // Locale type
  locale: null | string
}
```

**2. Type Extractors**

These utility types extract specific types from the config:

```typescript
// Get all collection names as union type
export type CollectionSlug<T extends PayloadGeneratedTypes> = StringKeyOf<TypedCollection<T>>
// Example result: 'posts' | 'users' | 'media'

// Get data type for specific collection
export type DataFromCollectionSlug<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
> = TypedCollection<T>[TSlug]
// Example result: Post (the Post interface)

// Get all global names
export type GlobalSlug<T extends PayloadGeneratedTypes> = StringKeyOf<TypedGlobal<T>>
// Example result: 'header' | 'footer' | 'settings'

// Get data type for specific global
export type DataFromGlobalSlug<
  T extends PayloadGeneratedTypes,
  TSlug extends GlobalSlug<T>,
> = TypedGlobal<T>[TSlug]

// Get auth collection names
export type AuthCollectionSlug<T extends PayloadGeneratedTypes> = StringKeyOf<TypedAuth<T>>
// Example result: 'users' | 'admins'

// Get upload collection names (collections with file fields)
export type UploadCollectionSlug<T extends PayloadGeneratedTypes> = StringKeyOf<
  TypedUploadCollection<T>
>
// Example result: 'media' | 'documents'
```

**3. Select and Transform Types**

These handle field selection (like GraphQL field selection):

```typescript
// Get select options for a collection
export type SelectFromCollectionSlug<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
> = TypedCollectionSelect<T>[TSlug]

// Transform collection data based on select
export type TransformCollectionWithSelect<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = TSelect extends SelectType
  ? TransformDataWithSelect<DataFromCollectionSlug<T, TSlug>, TSelect>
  : DataFromCollectionSlug<T, TSlug>

// Similar for globals
export type TransformGlobalWithSelect<
  T extends PayloadGeneratedTypes,
  TSlug extends GlobalSlug<T>,
  TSelect extends SelectType,
> = TSelect extends SelectType
  ? TransformDataWithSelect<DataFromGlobalSlug<T, TSlug>, TSelect>
  : DataFromGlobalSlug<T, TSlug>
```

**4. Operation Result Types**

```typescript
// For bulk operations (update/delete many)
export type BulkOperationResult<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = {
  docs: TransformCollectionWithSelect<T, TSlug, TSelect>[]
  errors: {
    id: DataFromCollectionSlug<T, TSlug>['id']
    message: string
  }[]
}

// For operations with optional data (disableErrors)
// From payload core: ApplyDisableErrors<T, false> = T
// From payload core: ApplyDisableErrors<T, true> = T | null

// For required fields in create/update
export type RequiredDataFromCollectionSlug<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
> = RequiredDataFromCollection<DataFromCollectionSlug<T, TSlug>>

// Makes auto-generated fields optional
export type RequiredDataFromCollection<TData extends JsonObject> = MarkOptional<
  TData,
  'createdAt' | 'id' | 'sizes' | 'updatedAt'
>
```

**5. Query Configuration Types**

```typescript
// Join query configuration
export type JoinQuery<T extends PayloadGeneratedTypes, TSlug extends CollectionSlug<T>> =
  TypedCollectionJoins<T>[TSlug] extends Record<string, string>
    ?
        | false
        | Partial<{
            [K in keyof TypedCollectionJoins<T>[TSlug]]:
              | {
                  count?: boolean
                  limit?: number
                  page?: number
                  sort?: Sort
                  where?: Where
                }
              | false
          }>
    : never

// Populate configuration
export type PopulateType<T extends PayloadGeneratedTypes> = Partial<TypedCollectionSelect<T>>

// ID type for collection
export type IDType<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
> = DataFromCollectionSlug<T, TSlug>['id']

// Locale type
export type TypedLocale<T extends PayloadGeneratedTypes> = NonNullable<T['locale']>
```

### Type Flow Example

Let's trace how types flow through a `find` operation:

```typescript
// 1. User code with generated types
import type { Config } from './payload-types'
const sdk = new PayloadSDK<Config>({ baseURL: '/api' })

// 2. Find operation with type inference
const result = await sdk.find({
  collection: 'posts', // TSlug inferred as 'posts'
  where: {
    status: { equals: 'published' },
  },
  select: {
    title: true,
    content: true,
  },
})

// 3. Type inference chain:
// - T = Config (from PayloadGeneratedTypes)
// - TSlug = 'posts' (from collection parameter)
// - TSelect = { title: true, content: true }
// - DataFromCollectionSlug<Config, 'posts'> = Post
// - TransformCollectionWithSelect<Config, 'posts', {...}>
//   = Pick<Post, 'title' | 'content'>
// - Result type = PaginatedDocs<Pick<Post, 'title' | 'content'>>

// 4. Usage with full type safety
result.docs[0].title // ✓ OK - string
result.docs[0].content // ✓ OK - string
result.docs[0].author // ✗ Error - not in select
```

---

## Core Features and Implementation

### Request Method (packages/sdk/src/index.ts)

The `request` method is the foundation of all operations:

```typescript
async request({
  args = {},
  file,
  init: incomingInit,
  json,
  method,
  path
}: {
  args?: OperationArgs
  file?: Blob
  init?: RequestInit
  json?: unknown
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
  path: string
}): Promise<Response> {
  // 1. Merge headers
  const headers = new Headers({
    ...this.baseInit.headers,
    ...incomingInit?.headers
  })

  // 2. Merge init options
  const init: RequestInit = {
    method,
    ...this.baseInit,
    ...incomingInit,
    headers
  }

  // 3. Handle body encoding
  if (json) {
    if (file) {
      // File upload: use FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('_payload', JSON.stringify(json))
      init.body = formData
    } else {
      // Regular JSON request
      headers.set('Content-Type', 'application/json')
      init.body = JSON.stringify(json)
    }
  }

  // 4. Build URL with query parameters
  const url = `${this.baseURL}${path}${buildSearchParams(args)}`

  // 5. Make request
  const response = await this.fetch(url, init)

  return response
}
```

**Key Features:**

1. **Header Merging**: Combines base headers with per-request headers
2. **File Upload Support**: Automatically switches to FormData when file is present
3. **Query Parameter Building**: Converts args to URL query string
4. **Custom Fetch**: Uses provided fetch implementation or global fetch

### Query Parameter Builder (packages/sdk/src/utilities/buildSearchParams.ts)

Converts operation arguments to URL query string:

```typescript
export type OperationArgs = {
  depth?: number
  draft?: boolean
  fallbackLocale?: false | string
  joins?: false | Record<string, unknown>
  limit?: number
  locale?: string
  page?: number
  pagination?: boolean
  populate?: Record<string, unknown>
  select?: SelectType
  sort?: Sort
  where?: Where
}

export const buildSearchParams = (args: OperationArgs): string => {
  const search: Record<string, unknown> = {}

  if (typeof args.depth === 'number') {
    search.depth = String(args.depth)
  }

  if (typeof args.page === 'number') {
    search.page = String(args.page)
  }

  if (typeof args.limit === 'number') {
    search.limit = String(args.limit)
  }

  if (typeof args.draft === 'boolean') {
    search.draft = String(args.draft)
  }

  if (typeof args.pagination === 'boolean') {
    search.pagination = String(args.pagination)
  }

  if (args.fallbackLocale) {
    search['fallback-locale'] = String(args.fallbackLocale)
  }

  if (args.locale) {
    search.locale = args.locale
  }

  if (args.sort) {
    const sanitizedSort = Array.isArray(args.sort) ? args.sort.join(',') : args.sort
    search.sort = sanitizedSort
  }

  if (args.select) {
    search.select = args.select
  }

  if (args.where) {
    search.where = args.where
  }

  if (args.populate) {
    search.populate = args.populate
  }

  if (args.joins) {
    search.joins = args.joins
  }

  if (Object.keys(search).length > 0) {
    // Uses qs-esm to serialize complex objects
    return stringify(search, { addQueryPrefix: true })
  }

  return ''
}
```

**Example Output:**

```typescript
buildSearchParams({
  page: 1,
  limit: 10,
  where: { status: { equals: 'published' } },
  sort: '-createdAt',
})
// Returns: "?page=1&limit=10&where[status][equals]=published&sort=-createdAt"
```

---

## Collections API

### 1. Find Operation (packages/sdk/src/collections/find.ts)

**Purpose:** Query multiple documents with filtering, sorting, pagination.

**Options Type:**

```typescript
export type FindOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = {
  /** Collection slug to query */
  collection: TSlug

  /** Control auto-population depth of relationships */
  depth?: number

  /** Query from versions/drafts table */
  draft?: boolean

  /** Fallback locale for missing translations */
  fallbackLocale?: false | TypedLocale<T>

  /** Join field query configuration */
  joins?: JoinQuery<T, TSlug>

  /** Maximum documents to return (default: 10) */
  limit?: number

  /** Query specific locale or 'all' */
  locale?: 'all' | TypedLocale<T>

  /** Page number (default: 1) */
  page?: number

  /** Enable/disable pagination and counts */
  pagination?: boolean

  /** Control populated document fields */
  populate?: PopulateType<T>

  /** Select specific fields to return */
  select?: TSelect

  /** Sort order (e.g., '-createdAt') */
  sort?: Sort

  /** Include trashed documents */
  trash?: boolean

  /** Filter query */
  where?: Where
}
```

**Implementation:**

```typescript
export async function find<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
>(
  sdk: PayloadSDK<T>,
  options: FindOptions<T, TSlug, TSelect>,
  init?: RequestInit,
): Promise<PaginatedDocs<TransformCollectionWithSelect<T, TSlug, TSelect>>> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'GET',
    path: `/${options.collection}`,
  })

  return response.json()
}
```

**Return Type:**

```typescript
type PaginatedDocs<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}
```

**Usage Examples:**

```typescript
// Basic find
const posts = await sdk.find({
  collection: 'posts',
})

// With filtering
const publishedPosts = await sdk.find({
  collection: 'posts',
  where: {
    status: { equals: 'published' },
  },
})

// With pagination and sorting
const recentPosts = await sdk.find({
  collection: 'posts',
  page: 1,
  limit: 20,
  sort: '-createdAt',
})

// With field selection
const postTitles = await sdk.find({
  collection: 'posts',
  select: {
    title: true,
    slug: true,
  },
})

// Complex query
const filteredPosts = await sdk.find({
  collection: 'posts',
  where: {
    and: [
      { status: { equals: 'published' } },
      { publishedAt: { less_than: new Date().toISOString() } },
      {
        or: [{ author: { equals: userId } }, { featured: { equals: true } }],
      },
    ],
  },
  sort: ['-featured', '-publishedAt'],
  limit: 10,
  depth: 2,
})
```

### 2. FindByID Operation (packages/sdk/src/collections/findByID.ts)

**Purpose:** Retrieve a single document by its ID.

**Options Type:**

```typescript
export type FindByIDOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TDisableErrors extends boolean,
  TSelect extends SelectType,
> = {
  /** Collection slug */
  collection: TSlug

  /** Document ID */
  id: number | string

  /** Control auto-population depth */
  depth?: number

  /** Return null instead of throwing on error */
  disableErrors?: TDisableErrors

  /** Query from drafts */
  draft?: boolean

  /** Fallback locale */
  fallbackLocale?: false | TypedLocale<T>

  /** Join configuration */
  joins?: JoinQuery<T, TSlug>

  /** Locale */
  locale?: 'all' | TypedLocale<T>

  /** Populate configuration */
  populate?: PopulateType<T>

  /** Field selection */
  select?: TSelect
}
```

**Implementation:**

```typescript
export async function findByID<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TDisableErrors extends boolean,
  TSelect extends SelectType,
>(
  sdk: PayloadSDK<T>,
  options: FindByIDOptions<T, TSlug, TDisableErrors, TSelect>,
  init?: RequestInit,
): Promise<ApplyDisableErrors<TransformCollectionWithSelect<T, TSlug, TSelect>, TDisableErrors>> {
  try {
    const response = await sdk.request({
      args: options,
      init,
      method: 'GET',
      path: `/${options.collection}/${options.id}`,
    })

    if (response.ok) {
      return response.json()
    } else {
      throw new Error()
    }
  } catch {
    if (options.disableErrors) {
      // @ts-expect-error generic nullable
      return null
    }

    throw new Error(`Error retrieving the document ${options.collection}/${options.id}`)
  }
}
```

**Usage Examples:**

```typescript
// Basic find by ID
const post = await sdk.findByID({
  collection: 'posts',
  id: '123',
})

// With error suppression
const post = await sdk.findByID({
  collection: 'posts',
  id: '123',
  disableErrors: true, // Returns null if not found
})
if (post) {
  // Handle found post
}

// With field selection
const postTitle = await sdk.findByID({
  collection: 'posts',
  id: '123',
  select: {
    title: true,
    slug: true,
  },
})
```

### 3. Create Operation (packages/sdk/src/collections/create.ts)

**Purpose:** Create a new document in a collection.

**Options Type:**

```typescript
export type CreateOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = {
  /** Collection slug */
  collection: TSlug

  /** Document data to create */
  data: RequiredDataFromCollectionSlug<T, TSlug>

  /** Auto-population depth */
  depth?: number

  /** Create as draft */
  draft?: boolean

  /** Fallback locale */
  fallbackLocale?: false | TypedLocale<T>

  /** File (for upload collections) */
  file?: TSlug extends UploadCollectionSlug<T> ? Blob | string : never

  /** Locale */
  locale?: 'all' | TypedLocale<T>

  /** Populate configuration */
  populate?: PopulateType<T>

  /** Field selection */
  select?: TSelect
}
```

**Implementation:**

```typescript
export async function create<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
>(
  sdk: PayloadSDK<T>,
  options: CreateOptions<T, TSlug, TSelect>,
  init?: RequestInit,
): Promise<TransformCollectionWithSelect<T, TSlug, TSelect>> {
  let file: Blob | undefined = undefined

  // Handle file upload
  if (options.file) {
    file = await resolveFileFromOptions(options.file)
  }

  const response = await sdk.request({
    args: options,
    file,
    init,
    json: options.data,
    method: 'POST',
    path: `/${options.collection}`,
  })

  const json = await response.json()

  return json.doc
}
```

**File Resolution Utility (packages/sdk/src/utilities/resolveFileFromOptions.ts):**

```typescript
export const resolveFileFromOptions = async (file: Blob | string) => {
  if (typeof file === 'string') {
    // Fetch file from URL
    const response = await fetch(file)
    const fileName = file.split('/').pop() ?? ''
    const blob = await response.blob()
    return new File([blob], fileName, { type: blob.type })
  } else {
    return file
  }
}
```

**Usage Examples:**

```typescript
// Create regular document
const newPost = await sdk.create({
  collection: 'posts',
  data: {
    title: 'Hello World',
    content: 'This is my first post',
    status: 'draft',
  },
})

// Create with file (upload collection)
const newMedia = await sdk.create({
  collection: 'media',
  file: myFileBlob,
  data: {
    alt: 'Profile picture',
  },
})

// Create from file URL
const mediaFromUrl = await sdk.create({
  collection: 'media',
  file: 'https://example.com/image.jpg',
  data: {},
})

// Create as draft
const draftPost = await sdk.create({
  collection: 'posts',
  data: {
    title: 'Draft Post',
    content: 'Work in progress',
  },
  draft: true,
})
```

### 4. Update Operation (packages/sdk/src/collections/update.ts)

**Purpose:** Update one or more documents.

**Options Types:**

```typescript
// Base options shared by both variants
export type UpdateBaseOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = {
  /** Collection slug */
  collection: TSlug

  /** Partial data to update */
  data: DeepPartial<RequiredDataFromCollectionSlug<T, TSlug>>

  /** Mark as autosave */
  autosave?: boolean

  /** Auto-population depth */
  depth?: number

  /** Update as draft */
  draft?: boolean

  /** Fallback locale */
  fallbackLocale?: false | TypedLocale<T>

  /** File (for upload collections) */
  file?: TSlug extends UploadCollectionSlug<T> ? Blob | string : never

  /** Locale */
  locale?: TypedLocale<T>

  /** Populate configuration */
  populate?: PopulateType<T>

  /** Publish specific locale */
  publishSpecificLocale?: string

  /** Field selection */
  select?: TSelect
}

// Update single document by ID
export type UpdateByIDOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
> = {
  id: number | string
  limit?: never
  where?: never
} & UpdateBaseOptions<T, TSlug, TSelect>

// Update multiple documents with query
export type UpdateManyOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
> = {
  id?: never
  limit?: number
  where: Where
} & UpdateBaseOptions<T, TSlug, TSelect>

// Union type
export type UpdateOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
> = UpdateByIDOptions<T, TSlug, TSelect> | UpdateManyOptions<T, TSlug, TSelect>
```

**Implementation:**

```typescript
export async function update<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
>(
  sdk: PayloadSDK<T>,
  options: UpdateOptions<T, TSlug, TSelect>,
  init?: RequestInit,
): Promise<
  BulkOperationResult<T, TSlug, TSelect> | TransformCollectionWithSelect<T, TSlug, TSelect>
> {
  let file: Blob | undefined = undefined

  if (options.file) {
    file = await resolveFileFromOptions(options.file)
  }

  const response = await sdk.request({
    args: options,
    file,
    init,
    json: options.data,
    method: 'PATCH',
    path: `/${options.collection}${options.id ? `/${options.id}` : ''}`,
  })

  const json = await response.json()

  // Single document returns doc directly
  if (options.id) {
    return json.doc
  }

  // Bulk operation returns docs array and errors
  return json
}
```

**Usage Examples:**

```typescript
// Update by ID
const updated = await sdk.update({
  collection: 'posts',
  id: '123',
  data: {
    title: 'Updated Title',
  },
})

// Bulk update
const bulkResult = await sdk.update({
  collection: 'posts',
  where: {
    status: { equals: 'draft' },
  },
  data: {
    status: 'archived',
  },
})
// bulkResult = {
//   docs: [...updated posts],
//   errors: [...failed updates]
// }

// Update with file
const updatedMedia = await sdk.update({
  collection: 'media',
  id: '456',
  file: newFileBlob,
  data: {
    alt: 'Updated alt text',
  },
})
```

### 5. Delete Operation (packages/sdk/src/collections/delete.ts)

**Purpose:** Delete one or more documents.

**Options Types:**

```typescript
// Base options
export type DeleteBaseOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = {
  /** Collection slug */
  collection: TSlug

  /** Auto-population depth */
  depth?: number

  /** Delete draft version */
  draft?: boolean

  /** Fallback locale */
  fallbackLocale?: false | TypedLocale<T>

  /** Locale */
  locale?: TypedLocale<T>

  /** Populate configuration */
  populate?: PopulateType<T>

  /** Field selection */
  select?: TSelect
}

// Delete by ID
export type DeleteByIDOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
> = {
  id: number | string
  where?: never
} & DeleteBaseOptions<T, TSlug, TSelect>

// Delete many
export type DeleteManyOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
> = {
  id?: never
  where: Where
} & DeleteBaseOptions<T, TSlug, TSelect>

export type DeleteOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
> = DeleteByIDOptions<T, TSlug, TSelect> | DeleteManyOptions<T, TSlug, TSelect>
```

**Implementation:**

```typescript
export async function deleteOperation<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectFromCollectionSlug<T, TSlug>,
>(
  sdk: PayloadSDK<T>,
  options: DeleteOptions<T, TSlug, TSelect>,
  init?: RequestInit,
): Promise<
  BulkOperationResult<T, TSlug, TSelect> | TransformCollectionWithSelect<T, TSlug, TSelect>
> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'DELETE',
    path: `/${options.collection}${options.id ? `/${options.id}` : ''}`,
  })

  const json = await response.json()

  if (options.id) {
    return json.doc
  }

  return json
}
```

**Usage Examples:**

```typescript
// Delete by ID
const deleted = await sdk.delete({
  collection: 'posts',
  id: '123',
})

// Bulk delete
const bulkResult = await sdk.delete({
  collection: 'posts',
  where: {
    status: { equals: 'archived' },
    createdAt: { less_than: '2023-01-01' },
  },
})
// bulkResult = {
//   docs: [...deleted posts],
//   errors: [...failed deletions]
// }
```

### 6. Count Operation (packages/sdk/src/collections/count.ts)

**Purpose:** Count documents matching a query.

**Options Type:**

```typescript
export type CountOptions<T extends PayloadGeneratedTypes, TSlug extends CollectionSlug<T>> = {
  /** Collection slug */
  collection: TSlug

  /** Locale */
  locale?: 'all' | TypedLocale<T>

  /** Filter query */
  where?: Where
}
```

**Implementation:**

```typescript
export async function count<T extends PayloadGeneratedTypes, TSlug extends CollectionSlug<T>>(
  sdk: PayloadSDK<T>,
  options: CountOptions<T, TSlug>,
  init?: RequestInit,
): Promise<{ totalDocs: number }> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'GET',
    path: `/${options.collection}/count`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Count all documents
const { totalDocs } = await sdk.count({
  collection: 'posts',
})

// Count with filter
const { totalDocs: publishedCount } = await sdk.count({
  collection: 'posts',
  where: {
    status: { equals: 'published' },
  },
})
```

---

## Globals API

Globals are singleton documents (site settings, headers, footers, etc.).

### 1. FindGlobal Operation (packages/sdk/src/globals/findOne.ts)

**Purpose:** Retrieve a global document.

**Options Type:**

```typescript
export type FindGlobalOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends GlobalSlug<T>,
  TSelect extends SelectType,
> = {
  /** Global slug */
  slug: TSlug

  /** Auto-population depth */
  depth?: number

  /** Query from drafts */
  draft?: boolean

  /** Fallback locale */
  fallbackLocale?: false | TypedLocale<T>

  /** Locale */
  locale?: 'all' | TypedLocale<T>

  /** Populate configuration */
  populate?: PopulateType<T>

  /** Field selection */
  select?: TSelect
}
```

**Implementation:**

```typescript
export async function findGlobal<
  T extends PayloadGeneratedTypes,
  TSlug extends GlobalSlug<T>,
  TSelect extends SelectFromGlobalSlug<T, TSlug>,
>(
  sdk: PayloadSDK<T>,
  options: FindGlobalOptions<T, TSlug, TSelect>,
  init?: RequestInit,
): Promise<TransformGlobalWithSelect<T, TSlug, TSelect>> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'GET',
    path: `/globals/${options.slug}`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Get site settings
const settings = await sdk.findGlobal({
  slug: 'settings',
})

// Get with field selection
const headerData = await sdk.findGlobal({
  slug: 'header',
  select: {
    logo: true,
    navigation: true,
  },
})
```

### 2. UpdateGlobal Operation (packages/sdk/src/globals/update.ts)

**Purpose:** Update a global document.

**Options Type:**

```typescript
export type UpdateGlobalOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends GlobalSlug<T>,
  TSelect extends SelectType,
> = {
  /** Global slug */
  slug: TSlug

  /** Partial data to update */
  data: DeepPartial<Omit<DataFromGlobalSlug<T, TSlug>, 'id'>>

  /** Auto-population depth */
  depth?: number

  /** Update as draft */
  draft?: boolean

  /** Fallback locale */
  fallbackLocale?: false | TypedLocale<T>

  /** Locale */
  locale?: 'all' | TypedLocale<T>

  /** Populate configuration */
  populate?: PopulateType<T>

  /** Publish specific locale */
  publishSpecificLocale?: TypedLocale<T>

  /** Field selection */
  select?: TSelect
}
```

**Implementation:**

```typescript
export async function updateGlobal<
  T extends PayloadGeneratedTypes,
  TSlug extends GlobalSlug<T>,
  TSelect extends SelectFromGlobalSlug<T, TSlug>,
>(
  sdk: PayloadSDK<T>,
  options: UpdateGlobalOptions<T, TSlug, TSelect>,
  init?: RequestInit,
): Promise<TransformGlobalWithSelect<T, TSlug, TSelect>> {
  const response = await sdk.request({
    args: options,
    init,
    json: options.data,
    method: 'POST',
    path: `/globals/${options.slug}`,
  })

  const { result } = await response.json()

  return result
}
```

**Usage Examples:**

```typescript
// Update settings
const updated = await sdk.updateGlobal({
  slug: 'settings',
  data: {
    siteName: 'My Awesome Site',
    maintenanceMode: false,
  },
})

// Update as draft
const draft = await sdk.updateGlobal({
  slug: 'header',
  data: {
    navigation: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
    ],
  },
  draft: true,
})
```

---

## Authentication API

### 1. Login Operation (packages/sdk/src/auth/login.ts)

**Purpose:** Authenticate a user and receive a JWT token.

**Types:**

```typescript
export type LoginOptions<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>> = {
  collection: TSlug
  data: TypedAuth<T>[TSlug]['login']
}

export type LoginResult<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>> = {
  exp?: number
  message: string
  token?: string
  user: DataFromCollectionSlug<T, TSlug>
}
```

**Implementation:**

```typescript
export async function login<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>>(
  sdk: PayloadSDK<T>,
  options: LoginOptions<T, TSlug>,
  init?: RequestInit,
): Promise<LoginResult<T, TSlug>> {
  const response = await sdk.request({
    init,
    json: options.data,
    method: 'POST',
    path: `/${options.collection}/login`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Login
const result = await sdk.login({
  collection: 'users',
  data: {
    email: 'user@example.com',
    password: 'password123',
  },
})

// Use token for subsequent requests
const posts = await sdk.find(
  { collection: 'posts' },
  {
    headers: {
      Authorization: `JWT ${result.token}`,
    },
  },
)
```

### 2. Me Operation (packages/sdk/src/auth/me.ts)

**Purpose:** Get the currently authenticated user.

**Types:**

```typescript
export type MeOptions<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>> = {
  collection: TSlug
}

export type MeResult<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>> = {
  collection?: TSlug
  exp?: number
  message: string
  strategy?: string
  token?: string
  user: DataFromCollectionSlug<T, TSlug>
}
```

**Implementation:**

```typescript
export async function me<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>>(
  sdk: PayloadSDK<T>,
  options: MeOptions<T, TSlug>,
  init?: RequestInit,
): Promise<MeResult<T, TSlug>> {
  const response = await sdk.request({
    init,
    method: 'GET',
    path: `/${options.collection}/me`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Get current user
const result = await sdk.me(
  { collection: 'users' },
  {
    headers: {
      Authorization: `JWT ${token}`,
    },
  },
)

console.log(result.user.email)
```

### 3. RefreshToken Operation (packages/sdk/src/auth/refreshToken.ts)

**Purpose:** Refresh an expired JWT token.

**Types:**

```typescript
export type RefreshOptions<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>> = {
  collection: TSlug
}

export type RefreshResult<T extends PayloadGeneratedTypes, TSlug extends AuthCollectionSlug<T>> = {
  exp: number
  refreshedToken: string
  setCookie?: boolean
  strategy?: string
  user: DataFromCollectionSlug<T, TSlug>
}
```

**Implementation:**

```typescript
export async function refreshToken<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
>(
  sdk: PayloadSDK<T>,
  options: RefreshOptions<T, TSlug>,
  init?: RequestInit,
): Promise<RefreshResult<T, TSlug>> {
  const response = await sdk.request({
    init,
    method: 'POST',
    path: `/${options.collection}/refresh-token`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Refresh token
const result = await sdk.refreshToken(
  { collection: 'users' },
  {
    headers: {
      Authorization: `JWT ${oldToken}`,
    },
  },
)

// Use new token
const newToken = result.refreshedToken
```

### 4. ForgotPassword Operation (packages/sdk/src/auth/forgotPassword.ts)

**Purpose:** Initiate password reset process.

**Types:**

```typescript
export type ForgotPasswordOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
> = {
  collection: TSlug
  data: {
    disableEmail?: boolean
    expiration?: number
  } & Omit<TypedAuth<T>[TSlug]['forgotPassword'], 'password'>
}
```

**Implementation:**

```typescript
export async function forgotPassword<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
>(
  sdk: PayloadSDK<T>,
  options: ForgotPasswordOptions<T, TSlug>,
  init?: RequestInit,
): Promise<{ message: string }> {
  const response = await sdk.request({
    init,
    json: options.data,
    method: 'POST',
    path: `/${options.collection}/forgot-password`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Request password reset
const result = await sdk.forgotPassword({
  collection: 'users',
  data: {
    email: 'user@example.com',
  },
})
// Sends reset email with token
```

### 5. ResetPassword Operation (packages/sdk/src/auth/resetPassword.ts)

**Purpose:** Reset password using token from forgot password email.

**Types:**

```typescript
export type ResetPasswordOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
> = {
  collection: TSlug
  data: {
    password: string
    token: string
  }
}

export type ResetPasswordResult<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
> = {
  token?: string
  user: DataFromCollectionSlug<T, TSlug>
}
```

**Implementation:**

```typescript
export async function resetPassword<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
>(
  sdk: PayloadSDK<T>,
  options: ResetPasswordOptions<T, TSlug>,
  init?: RequestInit,
): Promise<ResetPasswordResult<T, TSlug>> {
  const response = await sdk.request({
    init,
    json: options.data,
    method: 'POST',
    path: `/${options.collection}/reset-password`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Reset password with token from email
const result = await sdk.resetPassword({
  collection: 'users',
  data: {
    password: 'newSecurePassword123',
    token: tokenFromEmail,
  },
})

// User can now login with new password
```

### 6. VerifyEmail Operation (packages/sdk/src/auth/verifyEmail.ts)

**Purpose:** Verify user email address.

**Types:**

```typescript
export type VerifyEmailOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
> = {
  collection: TSlug
  token: string
}
```

**Implementation:**

```typescript
export async function verifyEmail<
  T extends PayloadGeneratedTypes,
  TSlug extends AuthCollectionSlug<T>,
>(
  sdk: PayloadSDK<T>,
  options: VerifyEmailOptions<T, TSlug>,
  init?: RequestInit,
): Promise<{ message: string }> {
  const response = await sdk.request({
    init,
    method: 'POST',
    path: `/${options.collection}/verify/${options.token}`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Verify email
const result = await sdk.verifyEmail({
  collection: 'users',
  token: tokenFromEmail,
})
```

---

## Versions Management

Payload supports version history for documents. The SDK provides operations to query and restore versions.

### 1. FindVersions Operation (packages/sdk/src/collections/findVersions.ts)

**Purpose:** Query version history for collection documents.

**Options Type:**

```typescript
export type FindVersionsOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
> = {
  collection: TSlug
  depth?: number
  draft?: boolean
  fallbackLocale?: false | TypedLocale<T>
  limit?: number
  locale?: 'all' | TypedLocale<T>
  page?: number
  pagination?: boolean
  populate?: PopulateType<T>
  select?: SelectType
  sort?: Sort
  trash?: boolean
  where?: Where
}
```

**Implementation:**

```typescript
export async function findVersions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
>(
  sdk: PayloadSDK<T>,
  options: FindVersionsOptions<T, TSlug>,
  init?: RequestInit,
): Promise<PaginatedDocs<TypeWithVersion<DataFromCollectionSlug<T, TSlug>>>> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'GET',
    path: `/${options.collection}/versions`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Get all versions for a specific document
const versions = await sdk.findVersions({
  collection: 'posts',
  where: {
    parent: { equals: postId },
  },
  sort: '-version.createdAt',
})

// Each version includes:
// - version.createdAt
// - version.updatedAt
// - version._status (draft/published)
// - ...all document fields at that version
```

### 2. FindVersionByID Operation (packages/sdk/src/collections/findVersionByID.ts)

**Purpose:** Get a specific version by ID.

**Implementation:**

```typescript
export async function findVersionByID<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TDisableErrors extends boolean,
>(
  sdk: PayloadSDK<T>,
  options: FindVersionByIDOptions<T, TSlug, TDisableErrors>,
  init?: RequestInit,
): Promise<ApplyDisableErrors<TypeWithVersion<DataFromCollectionSlug<T, TSlug>>, TDisableErrors>> {
  try {
    const response = await sdk.request({
      args: options,
      init,
      method: 'GET',
      path: `/${options.collection}/versions/${options.id}`,
    })

    if (response.ok) {
      return response.json()
    } else {
      throw new Error()
    }
  } catch {
    if (options.disableErrors) {
      // @ts-expect-error generic nullable
      return null
    }

    throw new Error(`Error retrieving the version document ${options.collection}/${options.id}`)
  }
}
```

**Usage Examples:**

```typescript
// Get specific version
const version = await sdk.findVersionByID({
  collection: 'posts',
  id: versionId,
})
```

### 3. RestoreVersion Operation (packages/sdk/src/collections/restoreVersion.ts)

**Purpose:** Restore a document to a previous version.

**Implementation:**

```typescript
export async function restoreVersion<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
>(
  sdk: PayloadSDK<T>,
  options: RestoreVersionByIDOptions<T, TSlug>,
  init?: RequestInit,
): Promise<DataFromCollectionSlug<T, TSlug>> {
  const response = await sdk.request({
    args: options,
    init,
    method: 'POST',
    path: `/${options.collection}/versions/${options.id}`,
  })

  return response.json()
}
```

**Usage Examples:**

```typescript
// Restore post to previous version
const restoredPost = await sdk.restoreVersion({
  collection: 'posts',
  id: versionId,
})
// Creates new version with content from versionId
```

### 4. Global Versions

Similar operations exist for globals:

```typescript
// Find global versions
const headerVersions = await sdk.findGlobalVersions({
  slug: 'header',
})

// Find specific global version
const version = await sdk.findGlobalVersionByID({
  slug: 'header',
  id: versionId,
})

// Restore global version
const restored = await sdk.restoreGlobalVersion({
  slug: 'header',
  id: versionId,
})
```

---

## File Upload Handling

File uploads are seamlessly integrated into create and update operations.

### Upload Workflow

**1. File Resolution (packages/sdk/src/utilities/resolveFileFromOptions.ts):**

```typescript
export const resolveFileFromOptions = async (file: Blob | string): Promise<Blob> => {
  if (typeof file === 'string') {
    // Fetch from URL
    const response = await fetch(file)
    const fileName = file.split('/').pop() ?? ''
    const blob = await response.blob()
    return new File([blob], fileName, { type: blob.type })
  } else {
    // Already a Blob/File
    return file
  }
}
```

**2. Request Encoding (in request method):**

```typescript
if (json) {
  if (file) {
    // File upload: multipart/form-data
    const formData = new FormData()
    formData.append('file', file)
    formData.append('_payload', JSON.stringify(json))
    init.body = formData
  } else {
    // Regular JSON
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(json)
  }
}
```

### Upload Examples

**Create with file:**

```typescript
// From Blob
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const media = await sdk.create({
  collection: 'media',
  file: file,
  data: {
    alt: 'Product image',
    caption: 'New product launch',
  },
})

// From URL
const media = await sdk.create({
  collection: 'media',
  file: 'https://example.com/image.jpg',
  data: {
    alt: 'Downloaded image',
  },
})
```

**Update with file:**

```typescript
// Replace file
const updated = await sdk.update({
  collection: 'media',
  id: mediaId,
  file: newFile,
  data: {
    alt: 'Updated alt text',
  },
})
```

**Type Safety:**

The `file` parameter is conditionally required based on collection type:

```typescript
type CreateOptions<T, TSlug, TSelect> = {
  // ...other options

  // Only available for upload collections
  file?: TSlug extends UploadCollectionSlug<T> ? Blob | string : never
}
```

---

## Request/Response Handling

### Request Flow

```
1. SDK Method Call
   ↓
2. Standalone Function
   ↓
3. sdk.request()
   ├─→ Merge headers (base + per-request)
   ├─→ Merge init options
   ├─→ Encode body (JSON or FormData)
   ├─→ Build URL with query params
   └─→ Call fetch
   ↓
4. Response
   ├─→ Parse JSON
   └─→ Return typed result
```

### Query Parameter Serialization

Complex objects are serialized using `qs-esm`:

```typescript
// Input
{
  where: {
    and: [
      { status: { equals: 'published' } },
      { author: { equals: 'user-123' } }
    ]
  },
  sort: '-createdAt',
  limit: 10
}

// Output
?where[and][0][status][equals]=published&where[and][1][author][equals]=user-123&sort=-createdAt&limit=10
```

### Response Parsing

Most operations parse response as JSON:

```typescript
const response = await sdk.request({ ... })
return response.json()
```

Some operations extract nested properties:

```typescript
// Update global returns { result: {...} }
const { result } = await response.json()
return result

// Create returns { doc: {...} }
const json = await response.json()
return json.doc
```

### Custom Endpoints

Use the low-level `request` method for custom endpoints:

```typescript
// Custom POST endpoint
const result = await sdk.request({
  method: 'POST',
  path: '/custom-endpoint',
  json: {
    customField: 'value',
  },
  args: {
    depth: 2,
  },
})

// Custom GET endpoint
const result = await sdk.request({
  method: 'GET',
  path: '/analytics/stats',
  args: {
    where: { date: { greater_than: '2024-01-01' } },
  },
})
```

---

## Error Handling Patterns

### 1. Try-Catch with Optional Suppression

Used in `findByID` and `findVersionByID`:

```typescript
try {
  const response = await sdk.request({ ... })

  if (response.ok) {
    return response.json()
  } else {
    throw new Error()
  }
} catch {
  if (options.disableErrors) {
    // @ts-expect-error generic nullable
    return null
  }

  throw new Error(`Error retrieving the document ${collection}/${id}`)
}
```

**Type Safety:**

```typescript
// With disableErrors: false (default)
const post = await sdk.findByID({
  collection: 'posts',
  id: '123',
})
// Type: Post

// With disableErrors: true
const post = await sdk.findByID({
  collection: 'posts',
  id: '123',
  disableErrors: true,
})
// Type: Post | null
```

### 2. Direct Response Return

Most operations don't catch errors, letting them bubble up:

```typescript
export async function find(...) {
  const response = await sdk.request({ ... })
  return response.json()  // Throws if response is not JSON
}
```

**Usage:**

```typescript
try {
  const posts = await sdk.find({ collection: 'posts' })
} catch (error) {
  // Handle network errors, JSON parse errors, etc.
  console.error('Failed to fetch posts:', error)
}
```

### 3. Bulk Operation Error Reporting

Bulk operations return partial success:

```typescript
const result = await sdk.update({
  collection: 'posts',
  where: { status: { equals: 'draft' } },
  data: { status: 'published' },
})

// Result includes both successes and failures
result.docs // Successfully updated documents
result.errors // Failed updates with reasons

// Example errors array:
// [
//   { id: '123', message: 'Validation failed: title required' },
//   { id: '456', message: 'Permission denied' }
// ]
```

### 4. Custom Error Handling

Wrap SDK calls with custom error handling:

```typescript
async function fetchPostSafely(id: string) {
  try {
    return await sdk.findByID({
      collection: 'posts',
      id,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      throw new NetworkError('Failed to connect to API')
    } else if (error instanceof SyntaxError) {
      // JSON parse error
      throw new ParseError('Invalid response from API')
    } else {
      // Other errors
      throw new APIError('Unexpected error', error)
    }
  }
}
```

---

## Integration Patterns

### 1. Type Generation Workflow

**Step 1: Define Payload Config**

```typescript
// payload.config.ts
import { buildConfig } from 'payload/config'

export default buildConfig({
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
        { name: 'author', type: 'relationship', relationTo: 'users' },
      ],
    },
  ],
})
```

**Step 2: Generate Types**

```bash
payload generate:types
```

Generates `payload-types.ts`:

```typescript
export interface Config {
  collections: {
    posts: Post
    users: User
  }
  collectionsSelect: {
    posts: PostsSelect
    users: UsersSelect
  }
  globals: {
    settings: Settings
  }
  // ...
}

export interface Post {
  id: string
  title: string
  content?: any
  author: string | User
  createdAt: string
  updatedAt: string
}
```

**Step 3: Use with SDK**

```typescript
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from './payload-types'

const sdk = new PayloadSDK<Config>({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Now fully type-safe!
```

### 2. Next.js Integration

**API Route Handler:**

```typescript
// app/api/posts/route.ts
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from '@/payload-types'

const sdk = new PayloadSDK<Config>({
  baseURL: process.env.PAYLOAD_API_URL,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')

  const posts = await sdk.find({
    collection: 'posts',
    page,
    limit: 10,
    sort: '-createdAt',
  })

  return Response.json(posts)
}
```

**Server Component:**

```typescript
// app/posts/page.tsx
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from '@/payload-types'

const sdk = new PayloadSDK<Config>({
  baseURL: process.env.PAYLOAD_API_URL
})

export default async function PostsPage() {
  const posts = await sdk.find({
    collection: 'posts',
    limit: 10
  })

  return (
    <div>
      {posts.docs.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

**Client Component:**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from '@/payload-types'

const sdk = new PayloadSDK<Config>({
  baseURL: '/api'
})

export function PostList() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    sdk.find({ collection: 'posts' })
      .then(result => setPosts(result.docs))
  }, [])

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

### 3. Authentication Integration

**Login Flow:**

```typescript
// lib/auth.ts
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from './payload-types'

const sdk = new PayloadSDK<Config>({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

export async function login(email: string, password: string) {
  const result = await sdk.login({
    collection: 'users',
    data: { email, password },
  })

  // Store token (cookie, localStorage, etc.)
  localStorage.setItem('token', result.token)

  return result.user
}

export async function getCurrentUser() {
  const token = localStorage.getItem('token')

  if (!token) return null

  try {
    const result = await sdk.me(
      { collection: 'users' },
      {
        headers: {
          Authorization: `JWT ${token}`,
        },
      },
    )
    return result.user
  } catch {
    // Token expired or invalid
    localStorage.removeItem('token')
    return null
  }
}

export async function refreshAuthToken() {
  const token = localStorage.getItem('token')

  if (!token) return null

  const result = await sdk.refreshToken(
    { collection: 'users' },
    {
      headers: {
        Authorization: `JWT ${token}`,
      },
    },
  )

  localStorage.setItem('token', result.refreshedToken)
  return result.refreshedToken
}
```

### 4. Middleware Pattern

**Add auth header to all requests:**

```typescript
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from './payload-types'

function getAuthToken() {
  return localStorage.getItem('token')
}

const sdk = new PayloadSDK<Config>({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  fetch: async (url, init) => {
    const token = getAuthToken()

    if (token) {
      const headers = new Headers(init.headers)
      headers.set('Authorization', `JWT ${token}`)
      init.headers = headers
    }

    return fetch(url, init)
  },
})
```

**Add retry logic:**

```typescript
const sdk = new PayloadSDK<Config>({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  fetch: async (url, init) => {
    let retries = 3

    while (retries > 0) {
      try {
        const response = await fetch(url, init)

        if (response.ok) {
          return response
        }

        // Retry on 5xx errors
        if (response.status >= 500) {
          retries--
          await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)))
          continue
        }

        return response
      } catch (error) {
        retries--
        if (retries === 0) throw error
      }
    }
  },
})
```

### 5. Testing with Custom Fetch

**Mock fetch for testing:**

```typescript
import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from './payload-types'

const mockFetch = jest.fn()

const sdk = new PayloadSDK<Config>({
  baseURL: '',
  fetch: mockFetch,
})

test('find posts', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      docs: [{ id: '1', title: 'Test Post' }],
      totalDocs: 1,
    }),
  })

  const result = await sdk.find({ collection: 'posts' })

  expect(result.docs).toHaveLength(1)
  expect(result.docs[0].title).toBe('Test Post')
})
```

**Local API integration (from SDK README):**

```typescript
import type { GeneratedTypes, SanitizedConfig } from 'payload'
import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
import { PayloadSDK } from '@payloadcms/sdk'

const api = {
  GET: REST_GET(config),
  POST: REST_POST(config),
  PATCH: REST_PATCH(config),
  DELETE: REST_DELETE(config),
  PUT: REST_PUT(config),
}

const awaitedConfig = await config

export const sdk = new PayloadSDK<GeneratedTypes>({
  baseURL: '',
  fetch: (path: string, init: RequestInit) => {
    const [slugs, search] = path.slice(1).split('?')
    const url = `${awaitedConfig.serverURL || 'http://localhost:3000'}${awaitedConfig.routes.api}/${slugs}${search ? `?${search}` : ''}`

    if (init.body instanceof FormData) {
      const file = init.body.get('file') as Blob
      if (file && init.headers instanceof Headers) {
        init.headers.set('Content-Length', file.size.toString())
      }
    }

    const request = new Request(url, init)

    const params = {
      params: Promise.resolve({
        slug: slugs.split('/'),
      }),
    }

    return api[init.method.toUpperCase()](request, params)
  },
})
```

---

## What We Need for tiny-cms

Based on the SDK analysis, here's what we need to implement for tiny-cms:

### Essential Features (Must Have)

**1. Collections CRUD**

- ✓ `find` - List/query documents
- ✓ `findByID` - Get single document
- ✓ `create` - Create document
- ✓ `update` - Update document (by ID only, not bulk)
- ✓ `delete` - Delete document (by ID only, not bulk)
- ✓ `count` - Count documents (for pagination)

**2. Authentication**

- ✓ `login` - User authentication
- ✓ `me` - Get current user
- ✓ `refreshToken` - Token refresh

**3. File Uploads**

- ✓ File upload support for media
- ✓ Both Blob and URL input
- ✓ FormData encoding

**4. Type Safety**

- ✓ Generic type parameters
- ✓ Type inference from config
- ✓ Collection/field autocomplete

### Optional Features (Nice to Have)

**1. Globals**

- `findGlobal` - Get global config
- `updateGlobal` - Update global config

**2. Advanced Auth**

- `forgotPassword` - Password reset flow
- `resetPassword` - Password reset completion
- `verifyEmail` - Email verification

**3. Versions**

- Skip for MVP - not essential for basic CMS

**4. Advanced Queries**

- `joins` - Relationship joins
- `populate` - Field population control
- `select` - Field selection

### Can Skip / Simplify

**1. Versions API**

- `findVersions`, `findVersionByID`, `restoreVersion`
- Not needed for tiny-cms MVP

**2. Bulk Operations**

- Update many documents at once
- Delete many documents at once
- tiny-cms will only do single-document operations

**3. Advanced Locale Support**

- `fallbackLocale`
- `locale: 'all'`
- tiny-cms will support simpler locale switching

**4. Draft System**

- `draft` parameter
- Draft/published workflow
- Can add later if needed

**5. Trash/Soft Delete**

- `trash` parameter
- Soft delete support
- Use hard deletes in tiny-cms

**6. Complex Pagination**

- `pagination: false` to skip counts
- tiny-cms will always paginate

---

## Simplification Opportunities

### 1. Simplified Type System

**Payload SDK:**

```typescript
export type FindOptions<
  T extends PayloadGeneratedTypes,
  TSlug extends CollectionSlug<T>,
  TSelect extends SelectType,
> = {
  collection: TSlug
  depth?: number
  draft?: boolean
  fallbackLocale?: false | TypedLocale<T>
  joins?: JoinQuery<T, TSlug>
  limit?: number
  locale?: 'all' | TypedLocale<T>
  page?: number
  pagination?: boolean
  populate?: PopulateType<T>
  select?: TSelect
  sort?: Sort
  trash?: boolean
  where?: Where
}
```

**tiny-cms (simplified):**

```typescript
export type FindOptions<TSlug extends CollectionSlug, TSelect = undefined> = {
  collection: TSlug
  where?: Where
  sort?: Sort
  limit?: number
  page?: number
  select?: TSelect
}
```

**Removed:**

- `depth` - auto-populate to depth 1 always
- `draft`, `trash` - no draft/soft-delete support
- `fallbackLocale`, `locale` - simplified locale handling
- `joins`, `populate` - simplified relationship loading
- `pagination` - always paginate

### 2. Simplified Update API

**Payload SDK supports both:**

```typescript
// Update by ID
sdk.update({ collection: 'posts', id: '123', data: {...} })

// Update many
sdk.update({ collection: 'posts', where: {...}, data: {...} })
```

**tiny-cms (ID only):**

```typescript
sdk.update({ collection: 'posts', id: '123', data: {...} })
// No bulk updates - simpler implementation
```

### 3. Simplified Error Handling

**Payload SDK:**

```typescript
// Optional error suppression
const post = await sdk.findByID({
  collection: 'posts',
  id: '123',
  disableErrors: true, // Returns null on error
})
```

**tiny-cms:**

```typescript
// Always throw errors - let caller handle
const post = await sdk.findByID({
  collection: 'posts',
  id: '123',
})
// Throws if not found - simpler API
```

### 4. Simplified File Uploads

**Payload SDK:**

```typescript
// Supports Blob and URL
sdk.create({
  collection: 'media',
  file: 'https://example.com/image.jpg', // Fetches from URL
  data: {},
})
```

**tiny-cms:**

```typescript
// Only support Blob/File
sdk.create({
  collection: 'media',
  file: fileBlob, // Must be Blob/File
  data: {},
})
// Simpler - no URL fetching needed
```

### 5. Simplified Request Method

**Payload SDK:**

```typescript
async request({
  args = {},
  file,
  init,
  json,
  method,
  path
}: RequestParams): Promise<Response>
```

**tiny-cms:**

```typescript
async request({
  method,
  path,
  body,
  params
}: RequestParams): Promise<Response>

// Simpler parameter structure
// - body: JSON or FormData (auto-detect)
// - params: Query parameters (object)
// - No separate 'args' and 'json'
```

### 6. Removed Features

**Authentication:**

- Remove: `forgotPassword`, `resetPassword`, `verifyEmail`
- Keep: `login`, `me`, `refreshToken`

**Versions:**

- Remove entire versions API
- Not needed for MVP

**Globals:**

- Remove globals API
- Use regular collections for config

### 7. Simplified Dependencies

**Payload SDK:**

```json
{
  "dependencies": {
    "payload": "workspace:*",
    "qs-esm": "7.0.2",
    "ts-essentials": "10.0.3"
  }
}
```

**tiny-cms:**

```json
{
  "dependencies": {
    // No external dependencies!
    // Inline URL param building
    // Use built-in TypeScript utility types
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core Foundation (Week 1)

**1. Type System (1-2 days)**

```typescript
// src/types.ts

// Config interface that generated types will implement
export interface GeneratedTypes {
  collections: {
    [slug: string]: Record<string, any>
  }
  auth: {
    [slug: string]: {
      login: { email: string; password: string }
    }
  }
}

// Type extractors
export type CollectionSlug<T> = keyof T['collections']
export type DataFromCollection<T, S> = T['collections'][S]
export type AuthCollectionSlug<T> = keyof T['auth']

// Operation options
export interface FindOptions<T, S extends CollectionSlug<T>> {
  collection: S
  where?: Where
  sort?: Sort
  limit?: number
  page?: number
}

// Query types
export interface Where {
  [field: string]: WhereCondition | Where
}

export type WhereCondition = {
  equals?: any
  not_equals?: any
  in?: any[]
  not_in?: any[]
  exists?: boolean
  // ... more operators
}

export type Sort = string | string[]
```

**2. SDK Class (1 day)**

```typescript
// src/sdk.ts

export class TinyCMSSDK<T extends GeneratedTypes> {
  private baseURL: string
  private baseInit: RequestInit
  private fetch: typeof fetch

  constructor(config: { baseURL: string; baseInit?: RequestInit; fetch?: typeof fetch }) {
    this.baseURL = config.baseURL
    this.baseInit = config.baseInit ?? {}
    this.fetch = config.fetch ?? globalThis.fetch
  }

  // Core request method
  private async request(params: RequestParams): Promise<Response> {
    // Implementation
  }

  // Collection methods
  find<S extends CollectionSlug<T>>(
    options: FindOptions<T, S>,
  ): Promise<PaginatedDocs<DataFromCollection<T, S>>> {
    return find(this, options)
  }

  // ... more methods
}
```

**3. Request Implementation (1 day)**

```typescript
// src/request.ts

export async function request(
  sdk: TinyCMSSDK,
  params: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    path: string
    body?: any
    params?: Record<string, any>
  },
): Promise<Response> {
  // Build URL
  const url = buildURL(sdk.baseURL, params.path, params.params)

  // Build init
  const init: RequestInit = {
    method: params.method,
    ...sdk.baseInit,
  }

  // Handle body
  if (params.body) {
    if (params.body instanceof FormData) {
      init.body = params.body
    } else {
      init.headers = {
        ...init.headers,
        'Content-Type': 'application/json',
      }
      init.body = JSON.stringify(params.body)
    }
  }

  // Make request
  return sdk.fetch(url, init)
}
```

### Phase 2: Collections API (Week 1-2)

**1. Find Operation (0.5 day)**

```typescript
// src/collections/find.ts

export async function find<T, S extends CollectionSlug<T>>(
  sdk: TinyCMSSDK<T>,
  options: FindOptions<T, S>,
): Promise<PaginatedDocs<DataFromCollection<T, S>>> {
  const response = await sdk.request({
    method: 'GET',
    path: `/${options.collection}`,
    params: {
      where: options.where,
      sort: options.sort,
      limit: options.limit,
      page: options.page,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${options.collection}`)
  }

  return response.json()
}
```

**2. FindByID, Create, Update, Delete (1 day)**

Each operation follows similar pattern:

- Separate file in `src/collections/`
- Type-safe options
- Call `sdk.request()` with appropriate params
- Parse and return response

**3. Count Operation (0.5 day)**

### Phase 3: Authentication (Week 2)

**1. Login (0.5 day)**

```typescript
// src/auth/login.ts

export type LoginOptions<T, S extends AuthCollectionSlug<T>> = {
  collection: S
  data: T['auth'][S]['login']
}

export type LoginResult<T, S> = {
  token: string
  user: DataFromCollection<T, S>
  exp: number
}

export async function login<T, S extends AuthCollectionSlug<T>>(
  sdk: TinyCMSSDK<T>,
  options: LoginOptions<T, S>,
): Promise<LoginResult<T, S>> {
  const response = await sdk.request({
    method: 'POST',
    path: `/${options.collection}/login`,
    body: options.data,
  })

  if (!response.ok) {
    throw new Error('Login failed')
  }

  return response.json()
}
```

**2. Me and RefreshToken (0.5 day)**

### Phase 4: File Uploads (Week 2)

**1. File Upload Support (1 day)**

```typescript
// src/collections/create.ts (enhanced)

export async function create<T, S extends CollectionSlug<T>>(
  sdk: TinyCMSSDK<T>,
  options: CreateOptions<T, S>,
): Promise<DataFromCollection<T, S>> {
  let body: any

  if (options.file) {
    // Use FormData for file uploads
    const formData = new FormData()
    formData.append('file', options.file)
    formData.append('_payload', JSON.stringify(options.data))
    body = formData
  } else {
    // Regular JSON body
    body = options.data
  }

  const response = await sdk.request({
    method: 'POST',
    path: `/${options.collection}`,
    body,
  })

  if (!response.ok) {
    throw new Error(`Failed to create ${options.collection}`)
  }

  const json = await response.json()
  return json.doc
}
```

### Phase 5: Utilities (Week 2-3)

**1. Query String Builder (0.5 day)**

```typescript
// src/utils/buildQueryString.ts

export function buildQueryString(params: Record<string, any>): string {
  const entries: string[] = []

  function serialize(obj: any, prefix: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key

      if (value === null || value === undefined) {
        continue
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        serialize(value, fullKey)
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          serialize({ [index]: item }, fullKey)
        })
      } else {
        entries.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`)
      }
    }
  }

  serialize(params)

  return entries.length > 0 ? `?${entries.join('&')}` : ''
}
```

**2. Error Classes (0.5 day)**

```typescript
// src/utils/errors.ts

export class SDKError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'SDKError'
  }
}

export class NotFoundError extends SDKError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends SDKError {
  constructor(
    message: string,
    public errors?: any[],
  ) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}
```

### Phase 6: Testing (Week 3)

**1. Unit Tests (2 days)**

- Test each operation with mock fetch
- Test type inference
- Test error handling

**2. Integration Tests (1 day)**

- Test against real Payload instance
- Test file uploads
- Test authentication flow

### Phase 7: Documentation (Week 3)

**1. README (1 day)**

- Installation
- Quick start
- API reference
- Examples

**2. TypeDoc Comments (0.5 day)**

- Add JSDoc comments to all public APIs
- Generate TypeDoc documentation

### Estimated Timeline

**Total: 3 weeks**

- Week 1: Core + Collections (Days 1-5)
- Week 2: Auth + Files + Utils (Days 6-10)
- Week 3: Testing + Docs (Days 11-15)

### File Structure

```
packages/sdk/
├── src/
│   ├── index.ts              # Main exports
│   ├── sdk.ts                # SDK class
│   ├── types.ts              # Type definitions
│   ├── request.ts            # Core request logic
│   ├── collections/          # Collection operations
│   │   ├── find.ts
│   │   ├── findByID.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   └── count.ts
│   ├── auth/                 # Auth operations
│   │   ├── login.ts
│   │   ├── me.ts
│   │   └── refreshToken.ts
│   └── utils/                # Utilities
│       ├── buildQueryString.ts
│       ├── buildURL.ts
│       └── errors.ts
├── tests/                    # Tests
│   ├── unit/
│   ├── integration/
│   └── mocks/
├── package.json
├── tsconfig.json
└── README.md
```

### Lines of Code Estimate

- Types: ~200 lines
- SDK class: ~100 lines
- Request: ~50 lines
- Collections ops: ~300 lines (6 files × 50 lines)
- Auth ops: ~150 lines (3 files × 50 lines)
- Utils: ~100 lines
- Tests: ~500 lines
- **Total: ~1,400 lines** (vs Payload's ~2,500)

---

## Conclusion

The Payload SDK is a well-architected, type-safe REST API client with comprehensive coverage of Payload CMS features. For tiny-cms, we can adopt its core patterns while simplifying significantly:

**Keep:**

- Generic type system for full type safety
- Method delegation pattern for organization
- Request/response handling architecture
- File upload support
- Authentication flow

**Simplify:**

- Remove versions API entirely
- Remove bulk operations (update/delete many)
- Remove draft/trash support
- Simplify locale handling
- Remove globals API
- Reduce dependencies to zero

**Result:**
A lean, focused SDK (~1,400 LOC vs 2,500) that provides essential CMS functionality with full type safety and a clean API surface.

---

_End of Report_
