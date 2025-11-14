# @tiny-cms/db-postgres

PostgreSQL database adapter for tiny-cms using Kysely ORM.

## Installation

```bash
pnpm add @tiny-cms/db-postgres kysely pg
pnpm add -D @types/pg
```

## Quick Start

```typescript
import { postgresAdapter, SchemaBuilder } from '@tiny-cms/db-postgres'
import { defineConfig } from '@tiny-cms/core'

const config = defineConfig({
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    },
    tablePrefix: 'cms_', // Optional: prefix all tables
  }),
  collections: [
    /* ... */
  ],
})
```

## PostgreSQL Adapter

### postgresAdapter(options)

Creates a Kysely PostgreSQL database adapter.

```typescript
const adapter = postgresAdapter({
  pool: {
    connectionString: string,
    host?: string,
    port?: number,
    database?: string,
    user?: string,
    password?: string,
    ssl?: SSLConfig,
    max?: number, // Connection pool size
    idleTimeoutMillis?: number,
    connectionTimeoutMillis?: number,
  },
  tablePrefix?: string, // Optional table name prefix
})
```

## Schema Builder

Generate PostgreSQL tables from collection definitions:

```typescript
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { SchemaBuilder } from '@tiny-cms/db-postgres'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = new Kysely({ dialect: new PostgresDialect({ pool }) })

const builder = new SchemaBuilder(db)

// Create tables for all collections
await builder.buildSchema(collections)

// Create table for single collection
await builder.createTableForCollection(collection)

// Drop all tables
await builder.dropSchema(collections)
```

### Field Mapping

How field types map to PostgreSQL columns:

| Field Type          | PostgreSQL Type | Notes                         |
| ------------------- | --------------- | ----------------------------- |
| text                | TEXT            |                               |
| email               | TEXT            |                               |
| richtext            | TEXT            |                               |
| number              | NUMERIC         | Better precision than INTEGER |
| checkbox            | BOOLEAN         | Default: false                |
| date                | TIMESTAMP       | With timezone                 |
| select (single)     | TEXT            |                               |
| select (multiple)   | JSONB           | Array stored as JSON          |
| relation (single)   | UUID            | Foreign key reference         |
| relation (multiple) | JSONB           | Array of UUIDs                |

### Auto-generated Columns

Every table automatically gets:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at TIMESTAMP NOT NULL DEFAULT now()
updated_at TIMESTAMP NOT NULL DEFAULT now()
deleted_at TIMESTAMP -- If softDelete enabled
```

## Features

### Type-Safe Queries

Kysely provides compile-time type safety:

```typescript
// Type-safe query building
const posts = await db
  .selectFrom('posts')
  .where('published', '=', true)
  .select(['id', 'title', 'content'])
  .execute()
```

### Automatic Conversions

- **snake_case ↔ camelCase**: Database uses snake_case, API uses camelCase
- **Date handling**: Auto conversion between string and Date objects
- **JSONB**: Arrays and objects stored as JSONB

### Query Operators

Supported where clause operators:

```typescript
{
  // Equality
  equals: value,
  not: value,

  // Arrays
  in: [value1, value2],
  notIn: [value1, value2],

  // Comparisons
  lt: number,
  lte: number,
  gt: number,
  gte: number,

  // Text search
  contains: 'searchterm',    // ILIKE %term%
  startsWith: 'prefix',      // ILIKE prefix%
  endsWith: 'suffix',        // ILIKE %suffix
}
```

### Pagination

Built-in pagination support:

```typescript
const result = await cms.find('posts', {
  limit: 10,
  offset: 0,
})

console.log({
  docs: result.docs,
  totalDocs: result.totalDocs,
  totalPages: result.totalPages,
  page: result.page,
  hasNextPage: result.hasNextPage,
  hasPrevPage: result.hasPrevPage,
})
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE tiny_cms_blog;
```

### 2. Enable UUID Extension

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Or use pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 3. Create Schema

Using the schema builder (recommended):

```typescript
// scripts/push-schema.ts
import { SchemaBuilder } from '@tiny-cms/db-postgres'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { cmsConfig } from './lib/cms'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = new Kysely({ dialect: new PostgresDialect({ pool }) })

const builder = new SchemaBuilder(db)
await builder.buildSchema(cmsConfig.collections)

console.log('✅ Schema created successfully')
```

Or manually create tables based on your collections.

## Example Schema

For a posts collection:

```typescript
{
  name: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richtext' },
    { name: 'author', type: 'relation', to: 'users' },
    { name: 'published', type: 'checkbox', defaultValue: false },
  ]
}
```

Generates:

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author UUID,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## Better-Auth Tables

When using authentication, better-auth creates these tables automatically:

- `user` - User accounts
- `session` - Active sessions
- `verification` - Email verification tokens
- `account` - OAuth provider accounts

No additional configuration needed.

## Connection Pooling

Recommended pool settings:

```typescript
{
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
}
```

## Environment Variables

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# Or individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tiny_cms
DB_USER=postgres
DB_PASSWORD=password

# SSL for production
DB_SSL=true
```

## Production Considerations

### SSL

```typescript
postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true, // Verify SSL cert
      ca: fs.readFileSync('path/to/ca.pem').toString(),
    },
  },
})
```

### Read Replicas

For read-heavy workloads, consider separate read replica connections in your application layer.

### Indexes

Add indexes for frequently queried fields:

```sql
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_author ON posts(author);
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

### Backups

Regular PostgreSQL backups:

```bash
pg_dump -U user database_name > backup.sql
```

## Troubleshooting

### Connection Errors

```
Error: Connection terminated unexpectedly
```

- Check DATABASE_URL is correct
- Verify PostgreSQL is running
- Check firewall/network settings
- Verify SSL configuration

### Type Errors

Kysely is strictly typed. If you get type errors, ensure your collection definitions match your actual database schema.

## License

MIT
