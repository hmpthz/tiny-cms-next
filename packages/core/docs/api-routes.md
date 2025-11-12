# API Routes

The Tiny CMS core package provides a RESTful API built with Hono.js for managing collections and documents.

## Base Path

All API routes are prefixed with a base path (default: `/api`). This can be configured in your CMS config:

```typescript
const config = {
  baseApiPath: '/api', // default
  // ... other config
}
```

## Collection Routes

### List Documents

```http
GET /collections/:collection
```

Query parameters:
- `limit` (number): Maximum documents to return (default: 10)
- `offset` (number): Number of documents to skip (default: 0)
- `where` (JSON): Filter conditions
- `orderBy` (JSON): Sort order

Example:
```typescript
// Using SDK
const result = await sdk.find('posts', {
  limit: 20,
  where: { published: true },
  orderBy: { createdAt: 'desc' }
})

// Direct API call
GET /api/collections/posts?limit=20&where={"published":true}&orderBy={"createdAt":"desc"}
```

### Create Document

```http
POST /collections/:collection
Content-Type: application/json

{
  "title": "New Post",
  "content": "Post content..."
}
```

### Get Document by ID

```http
GET /collections/:collection/:id
```

### Update Document

```http
PATCH /collections/:collection/:id
Content-Type: application/json

{
  "title": "Updated Title"
}
```

### Delete Document

```http
DELETE /collections/:collection/:id
```

### Count Documents

```http
GET /collections/:collection/count
```

Query parameters:
- `where` (JSON): Filter conditions

## Health Check

```http
GET /health
```

Returns:
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## Route Handlers

Route handlers are organized in separate files for better maintainability:

```
src/routes/
├── health.ts          # Health check endpoint
├── collections/
│   ├── find.ts       # List documents
│   ├── create.ts     # Create document
│   ├── findById.ts   # Get by ID
│   ├── update.ts     # Update document
│   ├── delete.ts     # Delete document
│   └── count.ts      # Count documents
└── index.ts          # Route registration
```

## Custom Route Registration

Plugins can register additional routes:

```typescript
const myPlugin: Plugin = (config) => {
  return config
}

myPlugin.registerRoutes = (app) => {
  app.get('/custom-route', (c) => {
    return c.json({ message: 'Custom route' })
  })
}
```

## Middleware

The CMS automatically applies the following middleware:

1. **CORS**: Enables cross-origin requests
2. **CMS Context**: Adds CMS instance to request context
3. **Lazy Initialization**: Ensures database connection before handling requests

## Error Handling

All routes return consistent error responses:

```json
{
  "error": "Error message"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

Authentication routes are automatically registered when auth is configured. See the [Authentication documentation](./auth.md) for details.