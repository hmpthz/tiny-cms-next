# @tiny-cms/sdk

Type-safe client SDK for tiny-cms. Provides a clean API for interacting with your tiny-cms backend from client-side code.

## Features

- 🔒 **Type-safe**: Full TypeScript support with generic types
- 🚀 **Zero dependencies**: Lightweight client with no external dependencies
- 📦 **Simple API**: Clean, intuitive methods for all operations
- 🔐 **Auth built-in**: Login, logout, and session management
- 📤 **File uploads**: Support for file fields with FormData

## Installation

```bash
pnpm add @tiny-cms/sdk
```

## Usage

```typescript
import { TinyCMSSDK } from '@tiny-cms/sdk'

// Initialize the SDK
const sdk = new TinyCMSSDK({
  baseUrl: 'http://localhost:3000',
  collections: ['posts', 'users', 'categories']
})

// Find documents
const posts = await sdk.find({
  collection: 'posts',
  where: { status: 'published' },
  sort: '-createdAt',
  limit: 10
})

// Create a document
const newPost = await sdk.create({
  collection: 'posts',
  data: {
    title: 'Hello World',
    content: '# My first post',
    status: 'draft'
  }
})

// Update a document
await sdk.update({
  collection: 'posts',
  id: newPost.id,
  data: { status: 'published' }
})

// Delete a document
await sdk.delete({
  collection: 'posts',
  id: newPost.id
})
```

## Authentication

```typescript
// Login
const user = await sdk.login({
  collection: 'users',
  data: {
    email: 'user@example.com',
    password: 'password'
  }
})

// Get current user
const me = await sdk.me({
  collection: 'users'
})

// Refresh token
await sdk.refreshToken({
  collection: 'users'
})
```

## API Reference

See the [full documentation](../../docs/sdk.md) for detailed API reference.
