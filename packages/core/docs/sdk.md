# SDK Usage

The Tiny CMS SDK provides a type-safe client for interacting with your CMS from the frontend.

## Installation

```typescript
import { TinyCmsSDK } from '@tiny-cms/core'

const sdk = new TinyCmsSDK({
  baseUrl: 'https://your-app.com',
  apiPrefix: '/api', // default
})
```

## Type Safety

The SDK supports TypeScript declaration merging for type-safe collection operations:

```typescript
// Extend the CollectionDocumentMap interface
declare module '@tiny-cms/core' {
  interface CollectionDocumentMap {
    posts: {
      title: string
      content: string
      published: boolean
    }
    users: {
      name: string
      email: string
      role: 'admin' | 'editor' | 'viewer'
    }
  }
}

// Now you get full type safety
const post = await sdk.findById('posts', 'id-123')
// post.title is typed as string

const user = await sdk.create('users', {
  name: 'John',
  email: 'john@example.com',
  role: 'editor'
})
// TypeScript enforces correct field types
```

## Core Methods

### find(collection, options?)

Find documents in a collection:

```typescript
const result = await sdk.find('posts', {
  limit: 10,
  offset: 0,
  where: { published: true },
  orderBy: { createdAt: 'desc' }
})

console.log(result.docs)       // Array of documents
console.log(result.totalDocs)  // Total count
console.log(result.totalPages) // Total pages
```

### findById(collection, id)

Get a single document by ID:

```typescript
const post = await sdk.findById('posts', 'post-123')
if (post) {
  console.log(post.title)
}
```

### create(collection, data)

Create a new document:

```typescript
const newPost = await sdk.create('posts', {
  title: 'New Post',
  content: 'Content...',
  published: false
})
```

### update(collection, id, data)

Update an existing document:

```typescript
const updated = await sdk.update('posts', 'post-123', {
  published: true
})
```

### delete(collection, id)

Delete a document:

```typescript
await sdk.delete('posts', 'post-123')
```

### count(collection, options?)

Count documents matching criteria:

```typescript
const count = await sdk.count('posts', {
  where: { published: true }
})
```

## Authentication Methods

### login(email, password)

Authenticate a user:

```typescript
const { user, token } = await sdk.login('user@example.com', 'password')
// Token is automatically stored and used for subsequent requests
```

### me()

Get current user:

```typescript
const user = await sdk.me()
```

### refreshToken()

Refresh authentication token:

```typescript
const { token } = await sdk.refreshToken()
```

## Plugin Extensions

Plugins can extend the SDK with additional methods. For example, the storage plugin adds:

```typescript
import { extendSDK } from '@tiny-cms/plugin-storage'
import { TinyCmsSDK } from '@tiny-cms/core'

// Extend SDK with storage methods
extendSDK(TinyCmsSDK)

const sdk = new TinyCmsSDK({...})

// New methods are now available
const signedUrl = await sdk.getStorageSignedUrl({
  filename: 'image.jpg',
  mimeType: 'image/jpeg'
})

await sdk.uploadToStorage(file, signedUrl.url)
await sdk.deleteFromStorage('image.jpg')
```

## Custom Requests

For custom API endpoints, use the `request` method:

```typescript
const response = await sdk.request('/custom-endpoint', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' })
})
```

## Error Handling

The SDK throws `SDKError` for API errors:

```typescript
import { SDKError } from '@tiny-cms/core'

try {
  await sdk.create('posts', { title: '' })
} catch (error) {
  if (error instanceof SDKError) {
    console.error('API Error:', error.message)
    console.error('Status:', error.status)
    console.error('Response:', error.response)
  }
}
```

## Configuration

### Authentication Token Storage

By default, the SDK stores auth tokens in memory. You can customize this:

```typescript
class CustomSDK extends TinyCmsSDK {
  protected setAuthToken(token: string | null) {
    if (token) {
      localStorage.setItem('cms-token', token)
    } else {
      localStorage.removeItem('cms-token')
    }
    super.setAuthToken(token)
  }

  constructor(config: SDKConfig) {
    super(config)
    // Restore token from storage
    const token = localStorage.getItem('cms-token')
    if (token) {
      this.setAuthToken(token)
    }
  }
}
```

### Request Interceptors

Add custom headers or modify requests:

```typescript
class CustomSDK extends TinyCmsSDK {
  async request(endpoint: string, options?: RequestInit) {
    // Add custom headers
    const customOptions = {
      ...options,
      headers: {
        ...options?.headers,
        'X-Custom-Header': 'value'
      }
    }

    return super.request(endpoint, customOptions)
  }
}
```