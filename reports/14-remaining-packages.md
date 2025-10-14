# Remaining Payload Packages Analysis

This report covers the remaining Payload packages that we won't need for tiny-cms initially. Each package serves specific use cases that are beyond our MVP scope.

## Table of Contents

1. [GraphQL Package](#1-graphql-package)
2. [Translations Package](#2-translations-package)
3. [Live Preview Packages](#3-live-preview-packages)
4. [SDK Package](#4-sdk-package)
5. [Payload Cloud Package](#5-payload-cloud-package)
6. [Tooling Packages](#6-tooling-packages)

---

## 1. GraphQL Package

**Location**: `packages/graphql`

### What It Does

The GraphQL package automatically generates a complete GraphQL API from Payload collections and globals. It provides an alternative to the REST API, allowing clients to query for exactly the data they need using GraphQL queries and mutations.

The package transforms Payload's schema definitions into GraphQL types, resolvers, and operations. It includes:

- Automatic schema generation from collection and global configs
- Query complexity analysis and limits
- Support for authentication, relationships, and localization
- Custom query and mutation extensions
- Built-in pagination, filtering, and sorting

### Core Components

**Schema Generation** (`src/schema/`):
- `initCollections.ts`: Converts collection configs into GraphQL types and operations
- `initGlobals.ts`: Converts global configs into GraphQL types and operations
- `buildObjectType.ts`: Creates GraphQL object types from field definitions
- `buildWhereInputType.ts`: Creates filter input types for queries
- `buildPaginatedListType.ts`: Creates paginated response types

**Resolvers** (`src/resolvers/`):
- `collections/`: CRUD operations for collections (find, findByID, create, update, delete)
- `globals/`: Operations for globals (findGlobal, updateGlobal)
- `auth/`: Authentication operations (login, logout, refresh, me, forgotPassword, resetPassword)

**Main Entry Point** (`src/index.ts`):
```typescript
export function configToSchema(config: SanitizedConfig): {
  schema: GraphQLSchema
  validationRules: (args: OperationArgs) => ValidationRule[]
}
```

The function:
1. Iterates through all collections and globals
2. Builds GraphQL types for each field type
3. Creates Query and Mutation types
4. Adds localization support if configured
5. Includes custom queries/mutations from config
6. Applies complexity limits and validation rules

### How Schema Generation Works

For each collection:

1. **Type Creation**: Field types are mapped to GraphQL types
   - Text fields → GraphQLString
   - Number fields → GraphQLInt/GraphQLFloat
   - Relationship fields → Object references with resolvers
   - Array/Block fields → Custom list types

2. **Query Generation**: Automatically creates queries
   - `findPosts`: Paginated list with filtering
   - `findPostByID`: Single document by ID
   - `countPosts`: Count documents
   - `docAccessPost`: Check document permissions

3. **Mutation Generation**: Creates mutations
   - `createPost`: Create new document
   - `updatePost`: Update existing document
   - `deletePost`: Delete document
   - `duplicatePost`: Duplicate document (if enabled)

4. **Version Support**: Adds version queries if versioning is enabled
   - `findPostVersions`: List versions
   - `findPostVersionByID`: Get specific version
   - `restorePostVersion`: Restore a version

5. **Auth Integration**: For auth collections, adds auth operations
   - `loginUser`: Login mutation
   - `logoutUser`: Logout mutation
   - `meUser`: Current user query
   - `refreshTokenUser`: Token refresh
   - `forgotPasswordUser`: Password reset request
   - `resetPasswordUser`: Password reset

### Integration with Core

The GraphQL package integrates with Payload core through:

1. **Access Control**: Uses Payload's access control functions for each resolver
2. **Hooks**: Triggers the same beforeOperation/afterOperation hooks as REST
3. **Validation**: Uses Payload's field validation
4. **Sanitization**: Uses the same data sanitization as REST operations
5. **Localization**: Respects locale settings and fallback locales

Example resolver flow:
```typescript
// GraphQL resolver calls the same core operation as REST
const findResolver = (collection) => async (_, args, context) => {
  const result = await context.req.payload.find({
    collection: collection.slug,
    where: args.where,
    limit: args.limit,
    page: args.page,
    depth: args.depth,
    locale: args.locale,
    // ... other options
  })
  return result
}
```

### Query Complexity Control

The package includes query complexity analysis to prevent expensive queries:

```typescript
const validationRules = [
  createComplexityRule({
    estimators: [
      fieldExtensionsEstimator(), // Use field-specific complexity
      simpleEstimator({ defaultComplexity: 1 }), // Fallback
    ],
    maximumComplexity: config.graphQL.maxComplexity, // From config
    variables: args.variableValues,
  }),
]
```

This prevents malicious queries like deeply nested relationship requests that could overload the server.

### Why We Don't Need It

**For tiny-cms MVP, we're building a REST-only API** for these reasons:

1. **Simplicity**: REST is more straightforward to implement and understand
2. **Smaller Bundle**: GraphQL adds significant dependencies (graphql, graphql-scalars, pluralize)
3. **No Client Requirement**: Our MVP doesn't need GraphQL client libraries
4. **Easier Debugging**: REST endpoints are easier to test with standard tools
5. **Sufficient for CRUD**: REST handles basic CRUD operations perfectly

GraphQL would be valuable for:
- Complex frontend requirements with varied data needs
- Mobile apps needing optimized data fetching
- Third-party integrations requiring flexible queries
- Applications with many relationships and deep nesting

---

## 2. Translations Package

**Location**: `packages/translations`

### What It Does

The translations package provides internationalization (i18n) for Payload's admin UI. It contains translation files for 45+ languages and utilities for managing translations at runtime.

### Structure

**Language Files** (`src/languages/`):
The package includes complete translations for:
- Arabic (ar), Azerbaijani (az), Bulgarian (bg)
- Bengali (Bangladesh - bnBd, India - bnIn)
- Catalan (ca), Czech (cs), Danish (da)
- German (de), English (en), Spanish (es)
- Estonian (et), Persian (fa), French (fr)
- Hebrew (he), Croatian (hr), Hungarian (hu)
- Armenian (hy), Indonesian (id), Icelandic (is)
- Italian (it), Japanese (ja), Korean (ko)
- Norwegian (nb), Dutch (nl), Polish (pl)
- Portuguese (Brazil - ptBR, Portugal - pt)
- Romanian (ro), Russian (ru), Swedish (sv)
- Thai (th), Turkish (tr), Ukrainian (uk)
- Chinese (Simplified - zhCN, Traditional - zhTW)
- And more...

Each language file exports a complete translation object covering:

**Authentication** (`authentication.*`):
```typescript
{
  account: 'Account',
  alreadyLoggedIn: 'Already logged in',
  apiKey: 'API Key',
  authenticated: 'Authenticated',
  backToLogin: 'Back to login',
  changePassword: 'Change Password',
  confirmPassword: 'Confirm Password',
  createFirstUser: 'Create first user',
  emailNotValid: 'The email provided is not valid',
  forgotPassword: 'Forgot Password',
  login: 'Login',
  logout: 'Log out',
  newPassword: 'New Password',
  // ... ~50 auth-related strings
}
```

**General UI** (`general.*`):
```typescript
{
  about: 'About',
  add: 'Add',
  addNew: 'Add New',
  all: 'All',
  allCollections: 'All Collections',
  api: 'API',
  autoSave: 'Autosave',
  backToDashboard: 'Back to Dashboard',
  cancel: 'Cancel',
  changes: 'Changes',
  clear: 'Clear',
  clearFilters: 'Clear Filters',
  close: 'Close',
  columns: 'Columns',
  // ... ~200 general UI strings
}
```

**Fields** (`fields.*`):
```typescript
{
  addLabel: 'Add {{label}}',
  addNew: 'Add New',
  addRelationship: 'Add Relationship',
  blockType: 'Block Type',
  chooseBetweenCustomTextOrDocument: 'Choose between custom text or document',
  chooseDocumentToLink: 'Choose a document to link to',
  chooseFromExisting: 'Choose from existing',
  chooseLabel: 'Choose {{label}}',
  // ... ~100 field-related strings
}
```

**Validation** (`validation.*`):
```typescript
{
  emailAddress: 'Please enter a valid email address',
  enterNumber: 'Please enter a valid number',
  fieldHasNo: 'This field has no',
  greaterThanMax: 'Value is greater than the maximum allowed',
  lessThanMin: 'Value is less than the minimum allowed',
  longerThanMin: 'This value must be longer than the minimum length',
  notValidDate: 'Value is not a valid date',
  required: 'This field is required',
  // ... ~30 validation strings
}
```

**Error Messages** (`error.*`):
```typescript
{
  correctInvalidFields: 'Please correct invalid fields',
  deletingFile: 'There was a problem while deleting this file',
  deletingTitle: 'There was an error deleting {{title}}',
  emailOrPasswordIncorrect: 'The email or password provided is incorrect',
  followingFieldsInvalid: 'The following fields are invalid:',
  loadingDocument: 'There was an error loading this document',
  // ... ~25 error strings
}
```

**Other Categories**:
- `upload.*`: File upload UI strings
- `version.*`: Version history strings
- `operators.*`: Filter operator names
- `nav.*`: Navigation strings

### Translation Utilities

**Core Functions** (`src/utilities/`):

1. **`initI18n()`**: Initialize the i18n system
   ```typescript
   export const initI18n = async (language: Language): Promise<void> => {
     const locale = await importDateFNSLocale(language)
     // Sets up date formatting with date-fns
   }
   ```

2. **`getTranslation()`**: Get a translated string
   ```typescript
   export const getTranslation = (
     translations: Record<string, any>,
     key: string,
     fallback?: string
   ): string => {
     // Supports nested keys like 'authentication.login'
     // Returns fallback or key if translation not found
   }
   ```

3. **`t()`**: Translate with interpolation
   ```typescript
   export const t = (
     key: string,
     variables?: Record<string, any>
   ): string => {
     // Supports variable interpolation
     // Example: t('fields.addLabel', { label: 'Post' }) → 'Add Post'
   }
   ```

4. **Language Detection**:
   ```typescript
   export const extractHeaderLanguage = (
     acceptLanguage: string
   ): string => {
     // Parses Accept-Language header
     // Returns best match from available languages
   }

   export const acceptedLanguages: string[] = [
     'ar', 'az', 'bg', 'cs', 'da', 'de', 'en',
     // ... all supported language codes
   ]

   export const rtlLanguages: string[] = ['ar', 'fa', 'he']
   ```

### Date Formatting Integration

The package uses `date-fns` for locale-aware date formatting:

```typescript
// src/importDateFNSLocale.ts
export const importDateFNSLocale = async (
  language: Language
): Promise<Locale> => {
  switch (language) {
    case 'ar':
      return (await import('date-fns/locale/ar')).default
    case 'de':
      return (await import('date-fns/locale/de')).default
    case 'en':
      return (await import('date-fns/locale/en-US')).default
    // ... all languages
  }
}
```

This ensures dates are formatted correctly for each language (e.g., "01/31/2024" in US English vs "31/01/2024" in UK English).

### How It Works with Payload

In the admin UI, translations are used everywhere:

```typescript
// Example in a React component
import { useTranslation } from '@payloadcms/ui'

const MyComponent = () => {
  const { t } = useTranslation()

  return (
    <button>
      {t('general:save')}  {/* → "Save" in English */}
    </button>
  )
}
```

The admin config specifies the language:

```typescript
export default buildConfig({
  admin: {
    language: 'en', // Default language
    // Or function for dynamic language:
    language: (req) => {
      return req.user?.language || 'en'
    }
  }
})
```

### Translation File Structure

Each language file exports this structure:

```typescript
import type { Language } from '../types.js'

export const enTranslations = {
  authentication: { /* ~50 keys */ },
  error: { /* ~25 keys */ },
  fields: { /* ~100 keys */ },
  general: { /* ~200 keys */ },
  operators: { /* ~15 keys */ },
  upload: { /* ~20 keys */ },
  validation: { /* ~30 keys */ },
  version: { /* ~20 keys */ },
}

export const en: Language = {
  locale: 'en',
  label: 'English',
  translations: enTranslations,
}
```

### Why We Don't Need It

**For tiny-cms MVP, we'll only support English** because:

1. **Single Language**: English-only reduces complexity significantly
2. **Hardcoded Strings**: We can use English strings directly in our UI
3. **Smaller Bundle**: Avoid 45+ language files and date-fns locales
4. **Faster Load**: No runtime language detection or switching
5. **Simpler Code**: No need to wrap every string in `t()`

We can add internationalization later when:
- We have users requesting specific languages
- We've validated the core functionality
- We have resources to maintain translations
- We want to expand to international markets

For now, keeping strings in English directly in components is simpler:

```typescript
// Instead of:
<button>{t('general:save')}</button>

// We'll use:
<button>Save</button>
```

---

## 3. Live Preview Packages

**Locations**:
- `packages/live-preview` (Core)
- `packages/live-preview-react` (React bindings)
- `packages/live-preview-vue` (Vue bindings)

### What Live Preview Does

Live preview allows content editors to see changes in real-time as they edit in the Payload admin panel. Instead of saving and navigating to the frontend to see changes, editors can see a preview pane that updates instantly as they type.

This is especially valuable for:
- Marketing teams creating landing pages
- Content writers previewing article layouts
- Developers demonstrating changes to clients
- Anyone needing instant visual feedback

### Architecture Overview

Live preview works through a window messaging system:

```
┌─────────────────────────────────────────┐
│   Payload Admin Panel (iframe parent)   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Edit Form (Left Side)           │ │
│  │   - User types in fields          │ │
│  │   - Changes trigger postMessage   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Preview Iframe (Right Side)     │ │
│  │   - Listens for messages          │ │
│  │   - Merges data with initial doc  │ │
│  │   - Re-renders with new data      │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Core Package (`@payloadcms/live-preview`)

This framework-agnostic package provides the messaging protocol.

**Key Functions**:

1. **`subscribe()`** - Listen for changes from admin
   ```typescript
   export const subscribe = <T>(args: {
     apiRoute?: string
     callback: (data: T) => void
     depth?: number
     initialData: T
     serverURL: string
   }): MessageHandler => {
     // Listens to window.postMessage events
     // Merges incoming changes with initial data
     // Calls callback with merged data

     const onMessage = async (event: MessageEvent) => {
       const mergedData = await handleMessage({
         event,
         initialData,
         serverURL,
         // ...
       })
       callback(mergedData)
     }

     window.addEventListener('message', onMessage)
     return onMessage
   }
   ```

2. **`handleMessage()`** - Process incoming messages
   ```typescript
   export const handleMessage = async <T>(args: {
     event: MessageEvent
     initialData: T
     serverURL: string
     depth?: number
     apiRoute?: string
   }): Promise<T> => {
     // 1. Validate message is from admin
     if (!isLivePreviewEvent(event)) return initialData

     // 2. Check if it's a document change
     if (!isDocumentEvent(event)) return initialData

     // 3. Merge changes with initial data
     const merged = mergeData(initialData, event.data)

     // 4. For relationships, fetch full data from API
     if (hasRelationships(merged)) {
       return await populateRelationships(merged, {
         serverURL,
         depth,
         apiRoute
       })
     }

     return merged
   }
   ```

3. **`mergeData()`** - Deep merge document changes
   ```typescript
   export const mergeData = <T>(
     initialData: T,
     incomingData: Partial<T>
   ): T => {
     // Deeply merge objects
     // Handle arrays specially:
     // - Replace entire array if changed
     // - Merge individual array items if objects
     return deepMerge(initialData, incomingData)
   }
   ```

4. **`ready()`** - Signal that preview is ready
   ```typescript
   export const ready = (args: {
     serverURL: string
   }): void => {
     // Tell parent window that preview has loaded
     window.parent.postMessage(
       {
         type: 'payload-live-preview',
         ready: true
       },
       serverURL
     )
   }
   ```

5. **`unsubscribe()`** - Clean up listener
   ```typescript
   export const unsubscribe = (
     handler: MessageHandler
   ): void => {
     window.removeEventListener('message', handler)
   }
   ```

**Event Types**:

```typescript
// src/types.ts
export type LivePreviewMessageEvent =
  | {
      type: 'payload-live-preview'
      data: Record<string, any>  // Document data
      externallyUpdatedRelationship?: string
    }
  | {
      type: 'payload-live-preview'
      ready: true
    }
```

### React Package (`@payloadcms/live-preview-react`)

Provides React hooks and components for live preview.

**`useLivePreview` Hook**:

```typescript
export const useLivePreview = <T>(props: {
  initialData: T
  serverURL: string
  apiRoute?: string
  depth?: number
}): {
  data: T
  isLoading: boolean
} => {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const onChange = useCallback((mergedData: T) => {
    setData(mergedData)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Subscribe to changes
    const subscription = subscribe({
      ...props,
      callback: onChange,
    })

    // Signal ready
    ready({ serverURL: props.serverURL })

    // Cleanup
    return () => {
      unsubscribe(subscription)
    }
  }, [props.serverURL, onChange])

  return { data, isLoading }
}
```

**Usage in Next.js App**:

```typescript
// app/posts/[slug]/page.tsx
'use client'
import { useLivePreview } from '@payloadcms/live-preview-react'

export default function PostPreview({ post }) {
  const { data, isLoading } = useLivePreview({
    initialData: post,
    serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
    depth: 2, // Populate relationships 2 levels deep
  })

  if (isLoading) {
    return <div>Loading preview...</div>
  }

  return (
    <article>
      <h1>{data.title}</h1>
      <div>{data.content}</div>
    </article>
  )
}
```

**`RefreshRouteOnSave` Component**:

```typescript
// src/RefreshRouteOnSave.tsx
export const RefreshRouteOnSave = ({
  serverURL,
  refresh = () => window.location.reload()
}: {
  serverURL: string
  refresh?: () => void
}) => {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== serverURL) return

      if (event.data.type === 'payload-live-preview'
          && event.data.saved) {
        refresh()
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [serverURL])

  return null
}
```

This component refreshes the preview when the document is saved, ensuring server-rendered data (like transformed images) is up-to-date.

### Vue Package (`@payloadcms/live-preview-vue`)

Similar to the React package but uses Vue composition API:

```typescript
// Hypothetical usage (not in codebase, but similar pattern)
import { useLivePreview } from '@payloadcms/live-preview-vue'

export default {
  setup() {
    const { data, isLoading } = useLivePreview({
      initialData: props.post,
      serverURL: import.meta.env.VITE_SERVER_URL,
    })

    return { data, isLoading }
  }
}
```

### Payload Admin Integration

On the admin side, live preview is configured per collection:

```typescript
export default buildConfig({
  collections: [
    {
      slug: 'posts',
      admin: {
        livePreview: {
          url: ({ data, documentInfo }) => {
            // Generate preview URL
            return `${process.env.NEXT_PUBLIC_URL}/posts/${data.slug}/preview`
          },
          // Optional: add auth token for private previews
          // Optional: customize breakpoints for responsive preview
        }
      }
    }
  ]
})
```

The admin UI then:
1. Renders an iframe with the preview URL
2. Sends postMessage when fields change
3. Includes document data in message payload
4. Handles relationship population requests
5. Shows loading state until ready message received

### Advanced Features

**Relationship Population**:

When a relationship field is changed, the preview needs the full related document:

```typescript
// Preview sends request
window.parent.postMessage({
  type: 'payload-live-preview',
  populateRelationship: {
    field: 'author',
    id: 'new-author-id',
  }
}, serverURL)

// Admin responds with full document
iframe.contentWindow.postMessage({
  type: 'payload-live-preview',
  data: fullAuthorDocument
}, previewURL)
```

**Draft vs Published**:

Live preview shows draft changes before publishing:

```typescript
const { data } = useLivePreview({
  initialData: post,
  serverURL: process.env.SERVER_URL,
  // Preview URL includes draft token:
  // /posts/my-post/preview?draft=true&token=xyz
})
```

### Why We Don't Need It

**For tiny-cms MVP, live preview is not essential** because:

1. **MVP Scope**: Basic CRUD is sufficient initially
2. **Complexity**: Requires iframe messaging, relationship handling, auth tokens
3. **Frontend Dependency**: Needs frontend framework integration
4. **Performance**: Adds overhead for real-time updates
5. **Use Case**: Most valuable for marketing/content teams, not all users

Live preview would be valuable later for:
- Teams doing heavy content editing
- Marketing landing pages
- Visual content verification
- Client demos
- Complex layouts with many relationships

For now, editors can:
1. Save draft
2. Click "View" button
3. See changes in new tab

This is simpler and sufficient for MVP validation.

---

## 4. SDK Package

**Location**: `packages/sdk`

### What It Does

The SDK package provides a type-safe, client-side JavaScript/TypeScript SDK for interacting with Payload's REST API. Instead of manually constructing fetch requests, developers can use a clean, typed API that handles:

- Request construction and serialization
- Response parsing and type casting
- Error handling
- Authentication token management
- Query parameter formatting

### Core Structure

The SDK is organized by operation type:

```
src/
├── auth/
│   ├── login.ts           - Login with credentials
│   ├── logout.ts          - Logout and clear session
│   ├── me.ts              - Get current user
│   ├── refreshToken.ts    - Refresh auth token
│   ├── forgotPassword.ts  - Request password reset
│   ├── resetPassword.ts   - Reset password with token
│   └── verifyEmail.ts     - Verify email address
├── collections/
│   ├── find.ts            - Find documents (paginated)
│   ├── findByID.ts        - Find single document
│   ├── create.ts          - Create document
│   ├── update.ts          - Update document(s)
│   ├── delete.ts          - Delete document(s)
│   ├── count.ts           - Count documents
│   ├── findVersions.ts    - List document versions
│   ├── findVersionByID.ts - Get specific version
│   └── restoreVersion.ts  - Restore document version
├── globals/
│   ├── findOne.ts         - Get global
│   ├── update.ts          - Update global
│   ├── findVersions.ts    - List global versions
│   ├── findVersionByID.ts - Get specific global version
│   └── restoreVersion.ts  - Restore global version
├── utilities/
│   └── buildSearchParams.ts - Convert options to query params
├── index.ts               - Main SDK class
└── types.ts               - TypeScript types
```

### Main SDK Class

```typescript
// src/index.ts (simplified)
export class PayloadSDK<GeneratedTypes = PayloadGeneratedTypes> {
  baseURL: string
  baseInit?: RequestInit
  customFetch?: FetchFunction

  constructor(args: {
    baseURL: string
    baseInit?: RequestInit
    fetch?: FetchFunction
  }) {
    this.baseURL = args.baseURL
    this.baseInit = args.baseInit
    this.customFetch = args.fetch
  }

  // Collections
  async find<TSlug extends CollectionSlug>(
    options: FindOptions<TSlug>
  ): Promise<PaginatedDocs<DataFromCollectionSlug<TSlug>>> {
    return find(this, options)
  }

  async findByID<TSlug extends CollectionSlug>(
    options: FindByIDOptions<TSlug>
  ): Promise<DataFromCollectionSlug<TSlug>> {
    return findByID(this, options)
  }

  async create<TSlug extends CollectionSlug>(
    options: CreateOptions<TSlug>
  ): Promise<DataFromCollectionSlug<TSlug>> {
    return create(this, options)
  }

  async update<TSlug extends CollectionSlug>(
    options: UpdateOptions<TSlug>
  ): Promise<DataFromCollectionSlug<TSlug>> {
    return update(this, options)
  }

  async delete<TSlug extends CollectionSlug>(
    options: DeleteOptions<TSlug>
  ): Promise<BulkOperationResult> {
    return deleteOperation(this, options)
  }

  async count<TSlug extends CollectionSlug>(
    options: CountOptions<TSlug>
  ): Promise<{ totalDocs: number }> {
    return count(this, options)
  }

  // Globals
  async findGlobal<TSlug extends GlobalSlug>(
    options: FindGlobalOptions<TSlug>
  ): Promise<DataFromGlobalSlug<TSlug>> {
    return findGlobal(this, options)
  }

  async updateGlobal<TSlug extends GlobalSlug>(
    options: UpdateGlobalOptions<TSlug>
  ): Promise<DataFromGlobalSlug<TSlug>> {
    return updateGlobal(this, options)
  }

  // Auth
  async login<TSlug extends AuthCollectionSlug>(
    options: LoginOptions<TSlug>
  ): Promise<LoginResult<TSlug>> {
    return login(this, options)
  }

  async logout<TSlug extends AuthCollectionSlug>(
    options: { collection: TSlug }
  ): Promise<void> {
    return logout(this, options)
  }

  async me<TSlug extends AuthCollectionSlug>(
    options: MeOptions<TSlug>
  ): Promise<MeResult<TSlug>> {
    return me(this, options)
  }

  async refreshToken<TSlug extends AuthCollectionSlug>(
    options: RefreshOptions<TSlug>
  ): Promise<RefreshResult<TSlug>> {
    return refreshToken(this, options)
  }

  // ... more methods
}
```

### Type Safety

The SDK leverages TypeScript's type system to provide full type safety:

```typescript
// types.ts
export type CollectionSlug = keyof GeneratedTypes['collections']
export type GlobalSlug = keyof GeneratedTypes['globals']

export type DataFromCollectionSlug<TSlug extends CollectionSlug> =
  GeneratedTypes['collections'][TSlug]

export type DataFromGlobalSlug<TSlug extends GlobalSlug> =
  GeneratedTypes['globals'][TSlug]

// Usage example:
const sdk = new PayloadSDK<GeneratedTypes>({
  baseURL: 'http://localhost:3000/api'
})

// TypeScript knows this returns Post[]
const posts = await sdk.find({ collection: 'posts' })

// TypeScript knows 'title' should be a string
const post = await sdk.create({
  collection: 'posts',
  data: {
    title: 'Hello World', // ✓ Type-safe
    // unknownField: 'value' // ✗ TypeScript error
  }
})
```

### Example Operations

**1. Find Documents**:

```typescript
// src/collections/find.ts (simplified)
export async function find<TSlug extends CollectionSlug>(
  sdk: PayloadSDK,
  options: FindOptions<TSlug>
): Promise<PaginatedDocs<DataFromCollectionSlug<TSlug>>> {
  const { collection, ...queryOptions } = options

  // Build query string from options
  const searchParams = buildSearchParams(queryOptions)

  // Make request
  const response = await sdk.fetch(
    `/${collection}${searchParams ? `?${searchParams}` : ''}`,
    {
      method: 'GET',
      ...sdk.baseInit,
    }
  )

  return response.json()
}

// Usage:
const result = await sdk.find({
  collection: 'posts',
  where: {
    status: { equals: 'published' }
  },
  limit: 10,
  page: 1,
  sort: '-createdAt',
  depth: 2,
})

// result.docs: Post[]
// result.totalDocs: number
// result.page: number
// result.totalPages: number
```

**2. Create Document**:

```typescript
// src/collections/create.ts (simplified)
export async function create<TSlug extends CollectionSlug>(
  sdk: PayloadSDK,
  options: CreateOptions<TSlug>
): Promise<DataFromCollectionSlug<TSlug>> {
  const { collection, data, draft, locale } = options

  const searchParams = buildSearchParams({ draft, locale })

  const response = await sdk.fetch(
    `/${collection}${searchParams ? `?${searchParams}` : ''}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...sdk.baseInit?.headers,
      },
      body: JSON.stringify(data),
    }
  )

  return response.json()
}

// Usage:
const newPost = await sdk.create({
  collection: 'posts',
  data: {
    title: 'My Post',
    content: 'Post content here',
    status: 'draft',
  },
  draft: true, // Save as draft
  locale: 'en', // For localized collections
})
```

**3. Update with Where Clause**:

```typescript
// Update multiple documents
const result = await sdk.update({
  collection: 'posts',
  where: {
    status: { equals: 'draft' }
  },
  data: {
    status: 'published'
  }
})

// result.docs: Post[] - Updated documents
// result.errors: Array - Any errors

// Update single document by ID
const post = await sdk.update({
  collection: 'posts',
  id: '123',
  data: {
    title: 'Updated Title'
  }
})
```

**4. Authentication**:

```typescript
// Login
const result = await sdk.login({
  collection: 'users',
  data: {
    email: 'user@example.com',
    password: 'password123',
  }
})

// result.token: string - JWT token
// result.user: User - User document

// Store token for future requests
const authenticatedSDK = new PayloadSDK({
  baseURL: 'http://localhost:3000/api',
  baseInit: {
    headers: {
      'Authorization': `Bearer ${result.token}`
    }
  }
})

// Get current user
const { user } = await authenticatedSDK.me({
  collection: 'users'
})

// Logout
await authenticatedSDK.logout({
  collection: 'users'
})
```

**5. Working with Versions**:

```typescript
// Get all versions of a document
const versions = await sdk.findVersions({
  collection: 'posts',
  where: { parent: { equals: postId } },
  limit: 10,
  sort: '-updatedAt',
})

// Get specific version
const version = await sdk.findVersionByID({
  collection: 'posts',
  id: versionId,
})

// Restore a version
const restored = await sdk.restoreVersion({
  collection: 'posts',
  id: versionId,
})
```

### Query Parameter Building

The SDK handles complex query parameter serialization:

```typescript
// src/utilities/buildSearchParams.ts
export function buildSearchParams(options: OperationArgs): string {
  const params = new URLSearchParams()

  // Simple params
  if (options.depth) params.set('depth', String(options.depth))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.page) params.set('page', String(options.page))
  if (options.sort) params.set('sort', options.sort)
  if (options.locale) params.set('locale', options.locale)

  // Complex where clause
  if (options.where) {
    params.set('where', JSON.stringify(options.where))
  }

  // Select fields
  if (options.select) {
    if (typeof options.select === 'object') {
      Object.entries(options.select).forEach(([key, value]) => {
        params.set(`select[${key}]`, String(value))
      })
    }
  }

  return params.toString()
}

// Converts:
{
  where: { status: { equals: 'published' } },
  limit: 10,
  sort: '-createdAt',
  depth: 2
}

// To:
// ?where={"status":{"equals":"published"}}&limit=10&sort=-createdAt&depth=2
```

### Custom Fetch Implementation

The SDK allows custom fetch implementations for testing or special environments:

```typescript
// Example: Use SDK in tests without HTTP server
import { REST_GET, REST_POST } from '@payloadcms/next/routes'

const sdk = new PayloadSDK({
  baseURL: '',
  fetch: async (path, init) => {
    const handler = {
      'GET': REST_GET(config),
      'POST': REST_POST(config),
      'PATCH': REST_PATCH(config),
      'PUT': REST_PUT(config),
      'DELETE': REST_DELETE(config),
    }[init.method]

    const request = new Request(
      `http://localhost:3000/api${path}`,
      init
    )

    return handler(request)
  }
})

// Now SDK calls go directly to handlers, no HTTP
const posts = await sdk.find({ collection: 'posts' })
```

### Usage Scenarios

**1. Frontend Client**:
```typescript
// In a React app
const sdk = new PayloadSDK({
  baseURL: process.env.NEXT_PUBLIC_API_URL
})

export const usePosts = () => {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    sdk.find({ collection: 'posts' })
      .then(result => setPosts(result.docs))
  }, [])

  return posts
}
```

**2. Server-Side**:
```typescript
// In Next.js Server Component
export async function getPosts() {
  const sdk = new PayloadSDK({
    baseURL: process.env.PAYLOAD_API_URL,
    baseInit: {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    }
  })

  const result = await sdk.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    limit: 10,
  })

  return result.docs
}
```

**3. External Integration**:
```typescript
// In a separate Node.js service
import { PayloadSDK } from '@payloadcms/sdk'

class SyncService {
  private sdk: PayloadSDK

  constructor() {
    this.sdk = new PayloadSDK({
      baseURL: process.env.CMS_URL,
      baseInit: {
        headers: {
          'Authorization': `Bearer ${process.env.CMS_API_KEY}`
        }
      }
    })
  }

  async syncPosts() {
    const posts = await this.sdk.find({
      collection: 'posts',
      where: { updatedAt: { greater_than: this.lastSync } }
    })

    // Process posts...
  }
}
```

### Why We Might Need It

**The SDK could be useful for tiny-cms** in these scenarios:

1. **Type Safety**: If building a separate frontend, the SDK provides full TypeScript support
2. **Consistency**: Ensures all API calls follow the same patterns
3. **Error Handling**: Built-in error handling and response parsing
4. **Testing**: Custom fetch allows testing without HTTP server
5. **External Services**: If building integrations that call our CMS

However, for MVP we might not need it because:

1. **Direct Local Access**: When using Payload in the same Next.js app, we can call `payload.find()` directly
2. **Simpler Fetching**: Native `fetch()` might be sufficient for simple cases
3. **Bundle Size**: SDK adds dependency weight
4. **Server Components**: Next.js Server Components can use Payload directly

**Decision**: We might use the SDK later for:
- Separate frontend applications (React, Vue, Mobile)
- External integrations (webhooks, syncing services)
- Client-side fetching in browser

For now, we can use Payload's local API in server components and native fetch in client components.

---

## 5. Payload Cloud Package

**Location**: `packages/payload-cloud`

### What It Does

The Payload Cloud package is a plugin that automatically configures Payload applications to work seamlessly with Payload Cloud's hosting infrastructure. It provides:

- Automatic file storage to AWS S3 (via Payload Cloud's CDN)
- Integrated email service through AWS SES
- Background job coordination across multiple instances
- Upload caching for better performance

This package is specifically designed for Payload Cloud hosting and has no value outside that environment.

### Core Plugin Structure

```typescript
// src/plugin.ts
export const payloadCloudPlugin = (pluginOptions?: PluginOptions) =>
  async (incomingConfig: Config): Promise<Config> => {
    let config = { ...incomingConfig }

    // Only activate on Payload Cloud
    if (process.env.PAYLOAD_CLOUD !== 'true') {
      return config
    }

    // Configure cloud storage
    if (pluginOptions?.storage !== false) {
      config = configureCloudStorage(config, pluginOptions)
    }

    // Configure cloud email
    if (pluginOptions?.email !== false) {
      config = await configureCloudEmail(config, pluginOptions)
    }

    // Configure job coordination
    config = configureJobCoordination(config, pluginOptions)

    return config
  }
```

### Cloud Storage Configuration

The plugin automatically configures S3 storage for all upload-enabled collections:

```typescript
// Simplified from src/plugin.ts
const configureCloudStorage = (config, options) => {
  return {
    ...config,
    collections: config.collections.map(collection => {
      if (!collection.upload) return collection

      return {
        ...collection,
        // Add hooks for S3 upload/delete
        hooks: {
          beforeChange: [
            ...collection.hooks?.beforeChange || [],
            getBeforeChangeHook({ collection })
          ],
          afterDelete: [
            ...collection.hooks?.afterDelete || [],
            getAfterDeleteHook({ collection })
          ],
          afterChange: [
            ...collection.hooks?.afterChange || [],
            // Optional: Upload caching
            getCacheUploadsAfterChangeHook({
              endpoint: 'https://cloud-api.payloadcms.com'
            })
          ],
        },
        upload: {
          ...collection.upload,
          disableLocalStorage: true, // Files go to S3, not local disk
          handlers: [
            ...collection.upload.handlers || [],
            getStaticHandler({
              cachingOptions: options?.uploadCaching,
              collection,
              debug: options?.debug,
            })
          ]
        }
      }
    }),
    upload: {
      ...config.upload,
      useTempFiles: true, // Use temp files for upload processing
    }
  }
}
```

**How It Works**:

1. **Upload Flow**:
   ```
   User uploads file
   → Saved to temp location
   → beforeChange hook uploads to S3
   → S3 returns CDN URL
   → URL saved in database
   → Temp file deleted
   ```

2. **Serving Files**:
   ```
   Request: /api/media/file.jpg
   → Static handler checks S3
   → Fetches from S3/CDN
   → Optional: Caches locally
   → Returns to client
   ```

3. **Delete Flow**:
   ```
   User deletes document
   → afterDelete hook triggers
   → Deletes file from S3
   → Clears any caches
   ```

### Cloud Email Configuration

Uses AWS SES through Payload Cloud's email service:

```typescript
// src/email.ts
export const payloadCloudEmail = async (args: {
  apiKey: string
  config: Config
  defaultDomain: string
  defaultFromAddress?: string
  defaultFromName?: string
  skipVerify?: boolean
}) => {
  const { apiKey, defaultDomain, defaultFromAddress, defaultFromName } = args

  // Configure nodemailer with AWS SES
  return {
    transportOptions: {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      auth: {
        user: process.env.AWS_SES_USER,
        pass: process.env.AWS_SES_PASS,
      }
    },
    from: {
      name: defaultFromName || 'Payload',
      address: defaultFromAddress || `noreply@${defaultDomain}`
    }
  }
}
```

**Email Features**:
- Automatic domain verification
- Sender email configuration
- AWS SES integration
- Email sending through Payload Cloud infrastructure

### Job Coordination

Payload Cloud runs multiple instances for redundancy. The plugin ensures background jobs only run on one instance:

```typescript
// Job coordination logic
const configureJobCoordination = (config, options) => {
  // Add global to store instance identifier
  config.globals = [
    ...config.globals || [],
    {
      slug: 'payload-cloud-instance',
      admin: { hidden: true },
      fields: [
        { name: 'instance', type: 'text', required: true }
      ]
    }
  ]

  // Custom shouldAutoRun function
  config.jobs.shouldAutoRun = async (payload) => {
    const retrievedGlobal = await payload.findGlobal({
      slug: 'payload-cloud-instance'
    })

    // Only run jobs if this is the designated instance
    return retrievedGlobal.instance === process.env.PAYLOAD_CLOUD_JOBS_INSTANCE
  }

  // On startup, one instance "claims" job running
  config.jobs.autoRun = async (payload) => {
    const instance = generateRandomString()
    process.env.PAYLOAD_CLOUD_JOBS_INSTANCE = instance

    await payload.updateGlobal({
      slug: 'payload-cloud-instance',
      data: { instance }
    })

    return [{ cron: '* * * * *', queue: 'default' }]
  }

  return config
}
```

**How It Works**:

1. On deployment, multiple instances start
2. First instance to update the `payload-cloud-instance` global "wins"
3. That instance's ID is stored
4. Only that instance runs background jobs
5. If that instance goes down, another claims the role on next cron run

This prevents duplicate job execution (e.g., sending the same email twice).

### Upload Caching

For better performance, the plugin can cache uploaded files:

```typescript
// src/hooks/uploadCache.ts
export const getCacheUploadsAfterChangeHook = (args: {
  endpoint: string
}) => async ({ doc, req }) => {
  // After upload to S3, tell Payload Cloud to cache it
  await fetch(`${args.endpoint}/cache/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYLOAD_CLOUD_CACHE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: doc.url,
      mimeType: doc.mimeType,
    })
  })
}

export const getCacheUploadsAfterDeleteHook = (args: {
  endpoint: string
}) => async ({ doc, req }) => {
  // After delete, invalidate cache
  await fetch(`${args.endpoint}/cache/upload/${doc.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.PAYLOAD_CLOUD_CACHE_KEY}`,
    }
  })
}
```

This ensures frequently accessed files are served quickly from edge locations.

### Plugin Options

```typescript
export type PluginOptions = {
  // Disable storage integration
  storage?: false

  // Disable email integration
  email?: false | {
    defaultFromAddress?: string
    defaultFromName?: string
    skipVerify?: boolean
  }

  // Disable upload caching
  uploadCaching?: false | {
    // Caching options
  }

  // Disable job auto-run coordination
  enableAutoRun?: false

  // Custom API endpoint
  endpoint?: string

  // Enable debug logging
  debug?: boolean
}
```

### Usage

```typescript
// payload.config.ts
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'

export default buildConfig({
  plugins: [
    payloadCloudPlugin({
      email: {
        defaultFromName: 'My CMS',
        defaultFromAddress: 'hello@example.com',
      },
      storage: true, // Enable S3 storage
      uploadCaching: true, // Enable caching
    })
  ],
  // ... rest of config
})
```

The plugin automatically detects Payload Cloud environment and configures accordingly.

### Environment Variables

The plugin expects these environment variables (set automatically by Payload Cloud):

```
PAYLOAD_CLOUD=true                    # Enables plugin
PAYLOAD_CLOUD_EMAIL_API_KEY=xxx       # Email service key
PAYLOAD_CLOUD_DEFAULT_DOMAIN=xxx      # Domain for emails
PAYLOAD_CLOUD_CACHE_KEY=xxx           # Cache service key
PAYLOAD_CLOUD_JOBS_INSTANCE=xxx       # Instance ID (set at runtime)
AWS_SES_USER=xxx                      # SES credentials
AWS_SES_PASS=xxx                      # SES credentials
```

### Why We Don't Need It

**For tiny-cms, we don't need this package** because:

1. **Not Using Payload Cloud**: We're self-hosting, so this plugin has no effect
2. **Local File Storage**: We'll use local file storage or our own S3 adapter
3. **Standard Email**: We can configure email directly with nodemailer
4. **Single Instance**: MVP will run on single instance, no job coordination needed
5. **No Cloud Features**: Cache coordination, CDN, etc. are Payload Cloud-specific

This package is purely for Payload Cloud customers. If we ever migrate to Payload Cloud hosting, we'd simply add the plugin and everything would "just work" with their infrastructure.

For self-hosting, we handle:
- File storage: Direct S3 integration or local storage
- Email: Direct SMTP/SendGrid/etc configuration
- Jobs: Single instance or manual coordination
- Caching: Our own CDN/caching strategy

---

## 6. Tooling Packages

### A. create-payload-app

**Location**: `packages/create-payload-app`

#### What It Does

`create-payload-app` is Payload's project scaffolding tool - the CLI you run to create a new Payload project. It's similar to `create-next-app` or `create-react-app`.

```bash
# Usage
npx create-payload-app@latest my-app
# or
pnpm create payload-app my-app
```

#### Features

**1. Interactive Setup**:

The CLI guides users through project creation with interactive prompts:

```typescript
// Prompts include:
- Project name
- Database type (MongoDB, PostgreSQL, SQLite)
- Package manager (npm, pnpm, yarn)
- Template selection (blank, blog, e-commerce, etc.)
- TypeScript or JavaScript
- Install dependencies?
```

**2. Template System**:

Templates are stored as packed `.tar.gz` files and extracted during creation:

```typescript
// src/scripts/pack-template-files.ts
// Packs templates from /templates directory
// Creates .template-cache/template-name.tar.gz files

// src/lib/init-next.ts
export async function initNext(args: InitNextArgs) {
  // 1. Copy template files to project directory
  copyRecursiveSync(templatePath, projectDir)

  // 2. Update package.json with correct dependencies
  updatePackageJson(projectDir, dbType)

  // 3. Install dependencies
  await installPackages(packageManager, projectDir)

  // 4. Configure database
  await configureDatabase(dbType, projectDir)

  // 5. Create payload.config.ts
  createPayloadConfig(projectDir, dbType)
}
```

**3. Next.js Integration**:

The tool can integrate Payload into an existing Next.js app:

```typescript
// Check for existing Next.js app
const nextAppDetails = await getNextAppDetails(projectDir)

if (nextAppDetails.hasTopLevelLayout) {
  // Warn user to move app to (app) directory
  // Payload needs top-level routes
}

// Wrap next.config.js with Payload configuration
await wrapNextConfig({
  nextConfigPath,
  nextConfigType, // .js, .mjs, .ts
})
```

**4. Database Configuration**:

Automatically configures the selected database:

```typescript
// For PostgreSQL
- Installs @payloadcms/db-postgres
- Creates DATABASE_URL in .env
- Adds connection pooling config

// For MongoDB
- Installs @payloadcms/db-mongodb
- Creates MONGODB_URI in .env
- Adds connection options

// For SQLite
- Installs @payloadcms/db-sqlite
- Creates local database file
- No connection string needed
```

**5. TypeScript Setup**:

Configures TypeScript with proper settings:

```typescript
// Updates tsconfig.json
const tsconfig = parse(await readFile('tsconfig.json'))

tsconfig.compilerOptions = {
  ...tsconfig.compilerOptions,
  paths: {
    '@payload-config': ['./payload.config.ts'],
    ...tsconfig.compilerOptions.paths,
  }
}

await writeFile('tsconfig.json', stringify(tsconfig))
```

#### Package Structure

```
src/
├── lib/
│   ├── init-next.ts          - Next.js integration
│   ├── install-packages.ts   - Dependency installation
│   ├── wrap-next-config.ts   - next.config wrapping
│   └── configure-database.ts - DB setup
├── utils/
│   ├── copy-recursive-sync.ts - File copying
│   ├── messages.ts            - CLI messages
│   └── log.ts                 - Colored logging
├── scripts/
│   └── pack-template-files.ts - Template bundling
└── types.ts                   - TypeScript types

bin/
└── cli.js                     - CLI entry point

.template-cache/
└── *.tar.gz                   - Packed templates
```

#### CLI Arguments

```bash
# Install with options
npx create-payload-app@latest \
  --name my-app \
  --db postgres \
  --template blog \
  --package-manager pnpm \
  --no-deps \
  --debug
```

#### Why We Don't Need It

**For tiny-cms, we don't need this package** because:

1. **Already Building**: We're building tiny-cms from scratch, not scaffolding
2. **Custom Structure**: We have our own architecture, not using templates
3. **Learning Focus**: We want to understand internals, not use boilerplate
4. **Different Scope**: create-payload-app is for users, we're developers

However, understanding this package helps us:
- See how Payload recommends structuring projects
- Understand template patterns
- Learn database configuration patterns
- See Next.js integration best practices

---

### B. eslint-config

**Location**: `packages/eslint-config`

#### What It Does

`@payloadcms/eslint-config` is Payload's shareable ESLint configuration. It enforces code style and best practices across the Payload monorepo and can be used in Payload projects.

#### Configuration Stack

The package combines multiple ESLint plugins:

```javascript
// index.mjs (simplified structure)
export default [
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React rules
  reactPlugin.configs.recommended,
  reactHooksPlugin.configs.recommended,

  // Accessibility
  jsxA11y.configs.recommended,

  // Import sorting and organization
  importPlugin.configs.recommended,

  // Code sorting (alphabetical)
  perfectionistPlugin.configs.recommended,

  // RegExp best practices
  regexpPlugin.configs.recommended,

  // Jest testing rules
  jestPlugin.configs.recommended,
  jestDomPlugin.configs.recommended,

  // Prettier integration (disables conflicting rules)
  prettierConfig,

  // Custom Payload rules
  payloadPlugin,
]
```

#### Key Rules

Some notable rules configured:

```javascript
{
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn', // Allow any but warn
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_', // Ignore _unused vars
    }],

    // React
    'react/prop-types': 'off', // Use TypeScript instead
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Import organization
    'import-x/order': ['error', {
      groups: [
        'builtin', 'external', 'internal',
        'parent', 'sibling', 'index'
      ],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' },
    }],

    // Code style
    'perfectionist/sort-imports': 'error',
    'perfectionist/sort-object-types': 'error',

    // Security
    'regexp/no-super-linear-backtracking': 'error',
    'regexp/no-useless-flag': 'error',
  }
}
```

#### Usage

```javascript
// eslint.config.js
import payloadConfig from '@payloadcms/eslint-config'

export default [
  ...payloadConfig,
  {
    // Your custom rules
    rules: {
      'no-console': 'warn',
    }
  }
]
```

#### Why We Don't Need It

**For tiny-cms, we might not need this package** because:

1. **Custom Preferences**: We may have our own style preferences
2. **Simpler Setup**: Fewer rules = faster linting
3. **Learning Overhead**: Understanding all rules takes time
4. **Opinionated**: Some rules may not fit our needs

However, we could:
- Use it as a reference for good practices
- Cherry-pick specific rules we like
- Adopt similar patterns in our own config

---

### C. eslint-plugin

**Location**: `packages/eslint-plugin`

#### What It Does

`@payloadcms/eslint-plugin` contains custom ESLint rules specific to Payload development. These are rules that enforce Payload-specific patterns and best practices.

#### Structure

```
index.mjs
└── Exports custom rules for Payload patterns

// Example custom rule (hypothetical):
{
  rules: {
    'payload/no-async-access': {
      // Enforce access control functions are sync
    },
    'payload/no-before-read-transform': {
      // Warn against using beforeRead for transforms
    },
    'payload/proper-hook-types': {
      // Ensure hooks have correct type signatures
    }
  }
}
```

These rules help maintain code quality specific to Payload's architecture.

#### Why We Don't Need It

**For tiny-cms, we don't need this package** because:

1. **Not Building Payload**: We're building our own CMS, not extending Payload
2. **Different Patterns**: Our architecture may differ from Payload's
3. **Unnecessary**: Custom rules are for maintaining large codebases

If we were contributing to Payload, this would be essential. For tiny-cms, it's irrelevant.

---

## Summary Table

| Package | Purpose | Complexity | Need for tiny-cms |
|---------|---------|------------|-------------------|
| **graphql** | GraphQL API generation | High | No - REST only for MVP |
| **translations** | Admin UI i18n (45+ languages) | Medium | No - English only |
| **live-preview** | Real-time preview in admin | High | No - Not MVP feature |
| **live-preview-react** | React hooks for live preview | Medium | No - Not MVP feature |
| **live-preview-vue** | Vue composables for live preview | Medium | No - Not MVP feature |
| **sdk** | Type-safe REST API client | Medium | Maybe - For frontend apps |
| **payload-cloud** | Payload Cloud hosting plugin | Low | No - Self-hosting |
| **create-payload-app** | Project scaffolding CLI | Low | No - Already building |
| **eslint-config** | Shared ESLint config | Low | No - Own preferences |
| **eslint-plugin** | Custom ESLint rules | Low | No - Not extending Payload |

## Total Package Count

Payload has **41 packages** in the monorepo, covering:
- Core functionality (payload, db-*, ui, next)
- Rich text editors (richtext-lexical, richtext-slate)
- Storage adapters (storage-s3, storage-vercel-blob, etc.)
- Email adapters (email-nodemailer, email-resend)
- Plugins (seo, redirects, search, etc.)
- API layers (graphql, sdk)
- Developer tools (translations, live-preview, create-payload-app)
- Tooling (eslint-config, eslint-plugin)

For tiny-cms MVP, we only need to understand:
- Core packages: payload, db-mongodb, ui, next (Reports 1-6)
- Storage: storage-s3 or local (Report 9)
- Email: email-nodemailer (Report 10)
- Rich text: richtext-lexical basics (Report 8)

All other packages are optional features we can add later based on user needs.

---

## Key Takeaways

1. **GraphQL is comprehensive** but adds complexity we don't need for REST-only MVP
2. **Translations are thorough** (45+ languages) but English-only is simpler initially
3. **Live preview is powerful** but not essential for basic content editing
4. **SDK provides type safety** which could be valuable for separate frontend apps
5. **Payload Cloud plugin** is environment-specific and not relevant for self-hosting
6. **Tooling packages** are for project setup and maintenance, not runtime functionality

All of these packages demonstrate Payload's enterprise-grade features, but for tiny-cms MVP, we can start simpler and add complexity only when needed. The core packages we analyzed in previous reports (1-13) are sufficient for a functional CMS.

Our focus should be on:
- Solid REST API (collections, globals, auth)
- File uploads (local or S3)
- Basic admin UI
- MongoDB integration
- Simple rich text (Lexical basics)

Everything else can be considered for v2 based on actual user needs.
