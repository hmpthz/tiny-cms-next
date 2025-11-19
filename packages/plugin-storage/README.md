# @tiny-cms/plugin-storage

Storage plugin for Tiny CMS that enables client‑side file uploads via signed URLs and adds storage routes to the core Hono app. The plugin ships with an S3‑compatible adapter interface — the bundled Supabase implementation is one adapter built on `@supabase/storage-js`.

## Features

- Client‑side uploads (direct to storage)
- Signed URLs (secure, time‑limited)
- S3‑compatible adapter interface; Supabase Storage is one implementation
- SDK extensions (adds storage methods to `TinyCmsSDK`)
- File deletion APIs

## Installation

```bash
pnpm add @tiny-cms/plugin-storage
```

## Usage

### Server-side Setup

```typescript
import { TinyCMS } from '@tiny-cms/core'
import { storagePlugin, createSupabaseAdapter } from '@tiny-cms/plugin-storage'

// Create storage adapter
const storageAdapter = createSupabaseAdapter({
  url: process.env.SUPABASE_URL!,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for server
  bucket: 'uploads',
  isPublic: true,
})

// Configure CMS with storage plugin
const cms = new TinyCMS({
  // ... other config
  plugins: [
    storagePlugin({
      adapter: storageAdapter,
    }),
  ],
})
```

### Client-side Setup

```typescript
import { TinyCmsSDK } from '@tiny-cms/core/sdk'
import { extendSDK, uploadFile } from '@tiny-cms/plugin-storage'

// Extend the SDK with storage methods
extendSDK(TinyCmsSDK)

// Create SDK instance
const sdk = new TinyCmsSDK({
  baseUrl: 'https://your-app.com',
  apiPrefix: '/api',
})
```

### Uploading Files

#### Method 1: Manual Upload Flow

```typescript
// 1. Get a signed URL for upload
const signedUrlResult = await sdk.getStorageSignedUrl({
  filename: 'image.jpg',
  mimeType: 'image/jpeg',
  prefix: 'avatars', // optional folder prefix
})

// 2. Upload file directly to storage
const file = document.querySelector('input[type="file"]').files[0]
await sdk.uploadToStorage(file, signedUrlResult.url, signedUrlResult.fields?.token)

// 3. (Optional) Create a media document in CMS
await sdk.create('media', {
  filename: file.name,
  mimeType: file.type,
  size: file.size,
  url: signedUrlResult.url,
  path: signedUrlResult.fields?.path,
})
```

#### Method 2: Helper Function

```typescript
import { uploadFile } from '@tiny-cms/plugin-storage'

const file = document.querySelector('input[type="file"]').files[0]

const result = await uploadFile(sdk, file, {
  prefix: 'avatars',
  createMediaDoc: true, // Automatically create media document
})

console.log('Uploaded to:', result.url)
```

### Deleting Files

```typescript
await sdk.deleteFromStorage('image.jpg', 'avatars')
```

## API Routes

The plugin contributes routes to the core Hono app and they are exposed under your Next.js `/api/*` handler:

- `POST /storage/signed-url` - Generate a signed URL for upload
- `DELETE /storage/delete` - Delete a file from storage

## Storage Adapters

### Supabase (S3‑compatible) Adapter

The built-in Supabase adapter supports:
- Direct client-side uploads using signed URLs
- Public and private bucket configurations
- Image transformations (for public buckets)
- File deletion

```typescript
const adapter = createSupabaseAdapter({
  url: 'https://your-project.supabase.co',
  key: 'your-service-role-key',
  bucket: 'uploads',
  isPublic: true, // Set to false for private buckets
})
```

### Custom Adapters

Implement the `StorageAdapter` interface to add your own S3‑compatible provider or a custom backend. Adapters can drive both upload and delete flows and can generate signed URLs consumed directly by the browser.

```typescript
import type { StorageAdapter } from '@tiny-cms/plugin-storage'

const customAdapter: StorageAdapter = {
  name: 'custom',

  async handleUpload(args) {
    // Handle server-side uploads (optional)
  },

  async handleDelete(args) {
    // Delete file from storage
  },

  generateURL(args) {
    // Generate public URL for file
  },

  async generateSignedURL(args) {
    // Generate signed URL for client-side upload
    return {
      url: 'https://...',
      fields: {}, // Optional metadata
    }
  },
}
```

## Security Considerations

1. **Service Role Keys**: Only use service role keys on the server side
2. **File Validation**: Validate file types and sizes before generating signed URLs
3. **Access Control**: Implement proper access control for file operations
4. **CORS**: Configure CORS settings on your storage provider for client-side uploads

## TypeScript Support

The plugin extends the Tiny CMS SDK types automatically when you import it:

```typescript
import { TinyCmsSDK } from '@tiny-cms/core/sdk'
import '@tiny-cms/plugin-storage' // This adds the storage methods to TinyCmsSDK

const sdk = new TinyCmsSDK({...})
// sdk.getStorageSignedUrl() is now available with full type support
```

## License

MIT
