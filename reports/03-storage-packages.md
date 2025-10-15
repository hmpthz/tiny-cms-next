# Storage Packages Analysis Report

## Executive Summary

This report analyzes Payload CMS's storage architecture, focusing on the cloud storage plugin system and storage adapters. The system uses a unified plugin (`plugin-cloud-storage`) that coordinates all storage adapters through a common interface, with individual storage packages implementing provider-specific functionality.

**Key Finding**: The storage system is highly abstracted and extensible, but adds significant complexity. For our simplified CMS using Supabase Storage, we can create a much simpler implementation inspired by this architecture.

---

## Package Overview

### 1. plugin-cloud-storage (Core Coordinator)

**Purpose**: Central plugin that orchestrates cloud storage across all adapters

**Location:** `payload-main/packages/plugin-cloud-storage/`

**Version**: 3.59.1

#### Dependencies

```json
{
  "@payloadcms/ui": "workspace:*",
  "find-node-modules": "^2.1.3",
  "range-parser": "^1.2.1"
}
```

#### Directory Structure

```
plugin-cloud-storage/
└── src/
    ├── hooks/        (beforeChange, afterDelete, afterRead)
    ├── fields/       (Field injection)
    ├── admin/        (Admin-specific fields)
    ├── client/       (Client-side upload handler factory)
    ├── utilities/    (Helper functions)
    └── exports/      (Client and utility exports)
```

---

### 2. storage-s3 (Primary Focus)

**Purpose**: Amazon S3 and S3-compatible storage adapter

**Location:** `payload-main/packages/storage-s3/`

**Version**: 3.59.1

#### Dependencies

```json
{
  "@aws-sdk/client-s3": "^3.614.0",
  "@aws-sdk/lib-storage": "^3.614.0",
  "@aws-sdk/s3-request-presigner": "^3.614.0",
  "@payloadcms/plugin-cloud-storage": "workspace:*"
}
```

#### Directory Structure

```
storage-s3/
└── src/
    ├── Main files           (index, handleUpload, handleDelete, generateURL,
    │                         generateSignedURL, staticHandler)
    ├── client/              (Client-side upload handler)
    └── exports/             (Client exports)
```

---

### 3. Other Storage Adapters (Brief)

#### storage-azure

- **Location:** `payload-main/packages/storage-azure/`
- **Purpose**: Azure Blob Storage adapter
- **Dependencies**: `@azure/storage-blob: ^12.11.0`, `@azure/abort-controller: ^1.1.0`

#### storage-gcs

- **Location:** `payload-main/packages/storage-gcs/`
- **Purpose**: Google Cloud Storage adapter
- **Dependencies**: `@google-cloud/storage: ^7.7.0`

#### storage-r2

- **Location:** `payload-main/packages/storage-r2/`
- **Purpose**: Cloudflare R2 adapter
- **Dependencies**: No external storage SDK (uses Cloudflare Workers bindings)
- **Note**: Designed for Cloudflare Workers environment

#### storage-uploadthing

- **Location:** `payload-main/packages/storage-uploadthing/`
- **Purpose**: UploadThing service adapter
- **Dependencies**: `uploadthing: 7.3.0`

#### storage-vercel-blob

- **Location:** `payload-main/packages/storage-vercel-blob/`
- **Purpose**: Vercel Blob Storage adapter
- **Dependencies**: `@vercel/blob: ^0.22.3`

---

## Storage Adapter Interface

### Core Types (from plugin-cloud-storage/src/types.ts)

```typescript
// plugin-cloud-storage/src/types.ts
interface File {
  buffer: Buffer
  filename: string
  filesize: number
  mimeType: string
  // ...
}

// Handler signatures
type HandleUpload = (args: {
  collection: CollectionConfig
  data: any
  file: File
  req: PayloadRequest
}) => Promise<void> | void

type HandleDelete = (args: {
  collection: CollectionConfig
  doc: /** ... */
  filename: string
  req: PayloadRequest
}) => Promise<void> | void

type GenerateURL = (args: {
  filename: string
  prefix?: string
  // ...
}) => Promise<string> | string

type StaticHandler = (req: PayloadRequest, args: { /** ... */ }) => Promise<Response> | Response

// Generated adapter
interface GeneratedAdapter {
  name: string
  handleUpload: HandleUpload
  handleDelete: HandleDelete
  staticHandler: StaticHandler
  generateURL?: GenerateURL
  // ...
}

// Adapter factory
type Adapter = (args: { collection: CollectionConfig; prefix?: string }) => GeneratedAdapter
```

---

## Deep Dive: storage-s3 Implementation

### 1. Main Plugin (src/index.ts)

**Lines 95-171**: Plugin factory function

- Creates S3 client with connection pooling (keepAlive: true, maxSockets: 100)
- Initializes client uploads if enabled
- Wraps cloud storage plugin with S3-specific adapter
- Sets `disableLocalStorage: true` for configured collections

**Key Configuration Options**:

```typescript
// storage-s3/src/index.ts:95-171
interface S3StorageOptions {
  acl?: 'private' | 'public-read'
  bucket: string
  collections: Record<string /** ... */>
  config: AWS.S3ClientConfig
  // ... more options
}
```

### 2. Upload Handler (src/handleUpload.ts)

**Strategy**:

- **Small files (< 50MB)**: Single `putObject` call
- **Large files (>= 50MB)**: Multipart upload using `@aws-sdk/lib-storage`

**Implementation Details**:

```typescript
// storage-s3/src/handleUpload.ts:19-61
const multipartThreshold = 1024 * 1024 * 50 // 50MB

export const getHandleUpload = ({ acl, bucket, getStorageClient, prefix }): HandleUpload => {
  return async ({ data, file }) => {
    const fileKey = path.posix.join(data.prefix || prefix, file.filename)

    const fileBufferOrStream = file.tempFilePath
      ? fs.createReadStream(file.tempFilePath)
      : file.buffer

    if (file.buffer.length < multipartThreshold) {
      // Simple upload for small files
      await getStorageClient().putObject({
        /** ... */
      })
    } else {
      // Multipart upload for large files
      const parallelUploadS3 = new Upload({
        client: getStorageClient(),
        params: {
          /** ... */
        },
        partSize: multipartThreshold,
        queueSize: 4,
      })
      await parallelUploadS3.done()
    }
  }
}
```

**Key Points**:

- Supports both buffers and temp file streams
- Automatic multipart for large files
- Configurable ACL per upload
- Uses prefix for file organization

### 3. Delete Handler (src/handleDelete.ts)

**Simple deletion**:

```typescript
// storage-s3/src/handleDelete.ts:11-18
export const getHandleDelete = ({ bucket, getStorageClient }): HandleDelete => {
  return async ({ doc: { prefix = '' }, filename }) => {
    await getStorageClient().deleteObject({
      Bucket: bucket,
      Key: path.posix.join(prefix, filename),
    })
  }
}
```

### 4. Static Handler (src/staticHandler.ts)

**Purpose**: Serves files with access control and optimization

**Key Features**:

- Pre-signed URL generation for private files
- Stream-based file serving
- ETag support for caching (304 responses)
- Range request handling
- Custom header modification
- Proper error handling and stream cleanup

**Implementation Highlights**:

```typescript
// storage-s3/src/staticHandler.ts:58-177
export const getHandler = ({
  bucket,
  collection,
  getStorageClient,
  signedDownloads,
}): StaticHandler => {
  return async (req, { headers, params: { clientUploadContext, filename } }) => {
    const abortController = new AbortController()

    // Generate pre-signed URL if enabled
    if (signedDownloads && !clientUploadContext) {
      const command = new GetObjectCommand({
        /** ... */
      })
      const signedUrl = await getSignedUrl(getStorageClient(), command, { expiresIn: 7200 })
      return Response.redirect(signedUrl, 302)
    }

    // Stream file from S3
    const object = await getStorageClient().getObject(
      {
        /** ... */
      },
      { abortSignal },
    )

    // Handle ETag caching
    if (etagFromHeaders === objectEtag) {
      return new Response(null, { headers, status: 304 })
    }

    // Stream response
    return new Response(object.Body, { headers, status: 200 })
  }
}
```

### 5. URL Generation (src/generateURL.ts)

**Simple URL construction**:

```typescript
// storage-s3/src/generateURL.ts:11-16
export const getGenerateURL =
  ({ bucket, config: { endpoint } }): GenerateURL =>
  ({ filename, prefix = '' }) => {
    const stringifiedEndpoint = typeof endpoint === 'string' ? endpoint : endpoint?.toString()
    return `${stringifiedEndpoint}/${bucket}/${path.posix.join(prefix, filename)}`
  }
```

### 6. Pre-signed URL Handler (src/generateSignedURL.ts)

**Purpose**: Generates pre-signed URLs for client-side uploads

```typescript
// storage-s3/src/generateSignedURL.ts:21-63
export const getGenerateSignedURLHandler = ({
  access,
  acl,
  bucket,
  collections,
  getStorageClient,
}): PayloadHandler => {
  return async (req) => {
    const { collectionSlug, filename, mimeType } = await req.json()

    // Check access
    if (!(await access({ collectionSlug, req }))) {
      throw new Forbidden()
    }

    const fileKey = path.posix.join(prefix, filename)

    // Generate pre-signed PUT URL (10 min expiry)
    const url = await getSignedUrl(
      getStorageClient(),
      new AWS.PutObjectCommand({
        /** ... */
      }),
      { expiresIn: 600 },
    )

    return Response.json({ url })
  }
}
```

### 7. Client Upload Handler (src/client/S3ClientUploadHandler.ts)

**Client-side upload implementation**:

```typescript
// storage-s3/src/client/S3ClientUploadHandler.ts:4-28
export const S3ClientUploadHandler = createClientUploadHandler({
  handler: async ({ apiRoute, collectionSlug, file, prefix, serverHandlerPath, serverURL }) => {
    // 1. Request pre-signed URL from server
    const response = await fetch(`${serverURL}${apiRoute}${serverHandlerPath}`, {
      body: JSON.stringify({
        /** ... */
      }),
      credentials: 'include',
      method: 'POST',
    })

    const { url } = await response.json()

    // 2. Upload directly to S3
    await fetch(url, {
      body: file,
      headers: {
        /** ... */
      },
      method: 'PUT',
    })

    return { prefix }
  },
})
```

---

## Plugin Integration Flow

### 1. Plugin Registration (plugin-cloud-storage/src/plugin.ts)

**Lines 18-150**: The cloudStoragePlugin function modifies the Payload config:

1. **For each upload collection**:
   - Wraps adapter factory to generate collection-specific adapter
   - Calls `getFields()` to inject storage fields
   - Adds `beforeChange` hook for uploads
   - Adds `afterDelete` hook for cleanup
   - Registers `staticHandler` for file serving
   - Sets `disableLocalStorage: true`
   - Configures `skipSafeFetch` for access control

2. **Field Injection**:
   - Adds hidden `url` field with `afterRead` hook
   - Adds hidden `prefix` field (if prefix enabled)
   - Adds hidden `sizes` group field with URL fields for each image size

### 2. Upload Flow (plugin-cloud-storage/src/hooks/beforeChange.ts)

**When a file is uploaded**:

1. Extract incoming files using `getIncomingFiles()`
2. If updating existing doc, delete old files first
3. Upload main file using `adapter.handleUpload()`
4. Upload all image size variants (if any)

```typescript
// plugin-cloud-storage/src/hooks/beforeChange.ts:13-66
export const getBeforeChangeHook = ({ adapter, collection }): CollectionBeforeChangeHook => {
  return async ({ data, originalDoc, req }) => {
    const files = getIncomingFiles({ data, req })

    if (files.length > 0) {
      // Delete old files if updating
      if (originalDoc) {
        const filesToDelete = [
          originalDoc.filename,
          ...Object.values(originalDoc.sizes || {}).map((size) => size.filename),
        ]
        await Promise.all(
          filesToDelete.map((filename) =>
            adapter.handleDelete({
              /** ... */
            }),
          ),
        )
      }

      // Upload new files (main + resized variants)
      await Promise.all(
        files.map((file) =>
          adapter.handleUpload({
            /** ... */
          }),
        ),
      )
    }

    return data
  }
}
```

### 3. Delete Flow (plugin-cloud-storage/src/hooks/afterDelete.ts)

**When a document is deleted**:

1. Collect all filenames (main + sizes)
2. Delete each file using `adapter.handleDelete()`

```typescript
// plugin-cloud-storage/src/hooks/afterDelete.ts:14-38
export const getAfterDeleteHook = ({ adapter, collection }): CollectionAfterDeleteHook => {
  return async ({ doc, req }) => {
    const filesToDelete = [
      doc.filename,
      ...Object.values(doc.sizes || {}).map((size) => size.filename),
    ]

    await Promise.all(
      filesToDelete.map((filename) =>
        adapter.handleDelete({
          /** ... */
        }),
      ),
    )

    return doc
  }
}
```

### 4. URL Generation Flow (plugin-cloud-storage/src/hooks/afterRead.ts)

**When a document is read**:

1. If `disablePayloadAccessControl` is true, generate direct URL
2. If `generateFileURL` is provided, use custom URL generation
3. Otherwise, URLs point to Payload's static handler

```typescript
// plugin-cloud-storage/src/hooks/afterRead.ts:13-39
export const getAfterReadHook = ({
  adapter,
  collection,
  disablePayloadAccessControl,
  generateFileURL,
  size,
}): FieldHook => {
  return async ({ data, value }) => {
    const filename = size ? data?.sizes?.[size.name]?.filename : data?.filename
    const prefix = data?.prefix
    let url = value

    if (disablePayloadAccessControl && filename) {
      url = await adapter.generateURL?.({
        /** ... */
      })
    }

    if (generateFileURL) {
      url = await generateFileURL({
        /** ... */
      })
    }

    return url
  }
}
```

---

## File Processing & Image Resizing

### Image Size Handling

**Key Files**:

- `/plugin-cloud-storage/src/utilities/getIncomingFiles.ts` (Lines 28-40)
- `/plugin-cloud-storage/src/fields/getFields.ts` (Lines 72-134)

**Process**:

1. **Image resizing happens in Payload core** (not in storage adapters)
2. Resized images are available in `req.payloadUploadSizes` during `beforeChange`
3. Storage adapter uploads each size variant as a separate file
4. Each size gets its own URL field in the `sizes` group

**Data Structure**:

```typescript
{
  filename: "image.jpg",
  url: "/api/media/file/image.jpg",
  sizes: {
    thumbnail: {
      filename: "image-thumbnail.jpg",
      url: "/api/media/file/image-thumbnail.jpg",
      width: 150,
      height: 150
    },
    large: {
      filename: "image-large.jpg",
      url: "/api/media/file/image-large.jpg",
      width: 1200,
      height: 800
    }
  }
}
```

---

## Client Uploads Feature

### Architecture

**Purpose**: Bypass server limits (e.g., Vercel 4.5MB limit) by uploading directly to cloud storage

**Flow**:

1. Client requests pre-signed URL from server
2. Server generates pre-signed URL with auth check
3. Client uploads file directly to cloud storage
4. Client submits form with file metadata to Payload

### Implementation Components

1. **Server Handler** (`generateSignedURL.ts`):
   - Endpoint: `/api/storage-s3-generate-signed-url`
   - Validates user access
   - Generates pre-signed PUT URL (10 min expiry)

2. **Client Handler** (`S3ClientUploadHandler.ts`):
   - React component registered as provider
   - Uses `useUploadHandlers` hook
   - Uploads file using pre-signed URL

3. **Initialization** (`initClientUploads.ts`):
   - Registers server endpoint
   - Adds client handler to admin dependencies
   - Injects provider for each collection

---

## Test Configuration

### Test Location

`/payload-main/test/storage-s3/`

### Test Collections (from config.ts)

1. **Media**: Basic S3 storage
2. **MediaWithPrefix**: S3 storage with prefix support
3. **MediaWithSignedDownloads**: S3 storage with pre-signed download URLs

### Configuration Example

```typescript
// test/storage-s3/config.ts:40-64
s3Storage({
  collections: {
    media: true,
    'media-with-prefix': { prefix: 'custom-prefix' },
    'media-with-signed-downloads': {
      signedDownloads: {
        /** ... */
      },
    },
  },
  bucket: process.env.S3_BUCKET,
  config: {
    credentials: {
      /** ... */
    },
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    // ...
  },
})
```

---

## Key Insights for Supabase Storage Implementation

### 1. Adapter Interface is Minimal

The core adapter interface only requires 4 methods:

- `handleUpload`: Upload file to storage
- `handleDelete`: Delete file from storage
- `staticHandler`: Serve file (can redirect to public URL)
- `generateURL`: Generate public URL (optional)

### 2. Plugin Handles All Hook Integration

The `plugin-cloud-storage` package:

- Automatically injects fields (url, prefix, sizes)
- Registers lifecycle hooks (beforeChange, afterDelete, afterRead)
- Handles file extraction and image size processing
- Manages access control

### 3. Supabase Storage Mapping

| Payload Concept | Supabase Storage Equivalent           |
| --------------- | ------------------------------------- |
| Bucket          | Bucket                                |
| Prefix          | Path prefix in bucket                 |
| handleUpload    | `storage.from(bucket).upload()`       |
| handleDelete    | `storage.from(bucket).remove()`       |
| generateURL     | `storage.from(bucket).getPublicUrl()` |
| staticHandler   | Redirect to public URL or use RLS     |

### 4. Simplifications for Our CMS

We can simplify significantly:

1. **No client uploads needed**: Since we're not deploying to Vercel, we don't need pre-signed URLs
2. **Simpler access control**: Use Supabase RLS instead of Payload's access control
3. **Direct public URLs**: Supabase provides public URLs, no need for staticHandler streaming
4. **No multipart uploads**: Supabase SDK handles large files internally
5. **Built-in image transformations**: Can leverage Supabase's image transformation API

### 5. Required Implementation

**Minimal Supabase adapter** (example):

```typescript
import { createClient } from '@supabase/storage-js'

function supabaseStorage({ bucket, supabaseUrl, supabaseKey, collections }): Adapter {
  const storage = createClient(supabaseUrl, supabaseKey)

  return ({ collection, prefix = '' }): GeneratedAdapter => ({
    name: 'supabase',

    handleUpload: async ({ data, file }) => {
      const path = `${data.prefix || prefix}/${file.filename}`
      await storage.from(bucket).upload(path, file.buffer, {
        /** ... */
      })
    },

    handleDelete: async ({ doc: { prefix = '' }, filename }) => {
      const path = `${prefix}/${filename}`
      await storage.from(bucket).remove([path])
    },

    generateURL: ({ filename, prefix = '' }) => {
      const path = `${prefix}/${filename}`
      const { data } = storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    },

    staticHandler: async (req, { params: { filename } }) => {
      /** ... redirect to public URL */
    },
  })
}
```

---

## Recommendations

### For Simplified CMS Implementation

1. **Don't use plugin-cloud-storage package**: Too much abstraction for our needs
2. **Implement storage directly in upload collections**: Simpler and more maintainable
3. **Use Supabase RLS for access control**: Leverage Supabase's built-in security
4. **Store only filenames in database**: Generate URLs on-the-fly from filenames
5. **Use Supabase's public buckets**: Simplify URL generation and serving
6. **Leverage Supabase image transformations**: No need to generate/store multiple sizes

### Storage Architecture

```typescript
// Simple upload collection
{
  slug: 'media',
  upload: true,
  fields: [
    {
      name: 'file',
      type: 'upload',
      // Custom field hooks for Supabase operations
      hooks: {
        beforeChange: async ({ value, req }) => {
          // Upload to Supabase
          const { data } = await supabaseStorage.upload(...)
          return data.path
        },
        afterRead: async ({ value }) => {
          // Generate public URL
          return supabaseStorage.getPublicUrl(value).data.publicUrl
        }
      }
    }
  ],
  hooks: {
    afterDelete: async ({ doc }) => {
      // Delete from Supabase
      await supabaseStorage.remove([doc.file])
    }
  }
}
```

### Image Sizes

Instead of storing multiple physical sizes:

```typescript
// At read time, generate transformation URLs
{
  filename: "image.jpg",
  url: "https://project.supabase.co/storage/v1/object/public/bucket/image.jpg",
  sizes: {
    thumbnail: "https://project.supabase.co/storage/v1/render/image/public/bucket/image.jpg?width=150&height=150",
    large: "https://project.supabase.co/storage/v1/render/image/public/bucket/image.jpg?width=1200&height=800"
  }
}
```

---

## Conclusion

Payload's storage system is enterprise-grade with features like:

- Multi-cloud support
- Client-side uploads
- Pre-signed URLs
- Multipart uploads
- Stream-based serving
- Access control integration

For our simplified CMS:

- We can achieve 80% of functionality with 20% of code
- Supabase Storage provides most features out-of-the-box
- Focus on simple, maintainable implementation
- Leverage Supabase's strengths (RLS, public URLs, image transformations)

**Next Steps**:

1. Design simplified storage schema
2. Implement basic Supabase upload/delete handlers
3. Add public URL generation
4. Implement image transformation URL generation
5. Test with actual files

---

## Appendix: File References

### plugin-cloud-storage

- Main plugin: `/packages/plugin-cloud-storage/src/plugin.ts:18-150`
- Types: `/packages/plugin-cloud-storage/src/types.ts:1-117`
- Upload hook: `/packages/plugin-cloud-storage/src/hooks/beforeChange.ts:13-66`
- Delete hook: `/packages/plugin-cloud-storage/src/hooks/afterDelete.ts:14-38`
- URL hook: `/packages/plugin-cloud-storage/src/hooks/afterRead.ts:13-39`
- Field injection: `/packages/plugin-cloud-storage/src/fields/getFields.ts:17-161`

### storage-s3

- Main adapter: `/packages/storage-s3/src/index.ts:95-216`
- Upload handler: `/packages/storage-s3/src/handleUpload.ts:19-61`
- Delete handler: `/packages/storage-s3/src/handleDelete.ts:11-18`
- Static handler: `/packages/storage-s3/src/staticHandler.ts:58-177`
- URL generation: `/packages/storage-s3/src/generateURL.ts:11-16`
- Pre-signed URLs: `/packages/storage-s3/src/generateSignedURL.ts:21-63`
- Client handler: `/packages/storage-s3/src/client/S3ClientUploadHandler.ts:4-28`

### Tests

- S3 config: `/test/storage-s3/config.ts:23-70`
- Integration tests: `/test/storage-s3/int.spec.ts`
