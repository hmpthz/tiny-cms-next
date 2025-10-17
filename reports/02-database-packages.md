# Database Packages Analysis Report

## Executive Summary

This report analyzes the database-related packages in PayloadCMS, with deep focus on `db-postgres` and `drizzle` packages, which form the foundation of the PostgreSQL adapter system. The architecture follows a clear separation of concerns where database-specific adapters (db-postgres, db-sqlite, etc.) rely on a shared `drizzle` package that provides database-agnostic operations.

**Key Finding**: The database layer is highly abstracted with extensive bloat for features we don't need in our simplified CMS. The complexity comes from supporting:

- Multiple database engines (Postgres, SQLite, MongoDB)
- Versions and drafts systems
- Localization (multiple languages)
- Complex relationships (many-to-many, polymorphic)
- Migration systems
- Transaction management
- Separate tables for texts, numbers, and relationships

---

## Package Overview

### Package Dependency Graph

```
@payloadcms/db-postgres (PostgreSQL adapter)
  └─ @payloadcms/drizzle (Shared SQL adapter logic)
  └─ drizzle-orm (ORM)
  └─ drizzle-kit (Schema migrations)
  └─ pg (node-postgres driver)

@payloadcms/drizzle (Core SQL package)
  └─ drizzle-orm
  └─ to-snake-case
  └─ uuid
  └─ dequal

@payloadcms/db-mongodb (MongoDB adapter)
  └─ mongoose (MongoDB ODM)
  └─ mongoose-paginate-v2

@payloadcms/db-sqlite
@payloadcms/db-vercel-postgres
@payloadcms/db-d1-sqlite (Cloudflare D1)
  └─ All depend on @payloadcms/drizzle
```

---

## 1. @payloadcms/db-postgres (DETAILED ANALYSIS)

### Package Information

**Location:** `payload-main/packages/db-postgres/`

- **Version**: 3.59.1
- **Description**: The officially supported Postgres database adapter for Payload
- **Main Dependencies**:
  - `@payloadcms/drizzle@workspace:*` - Core adapter logic
  - `drizzle-orm@0.44.2` - ORM layer
  - `drizzle-kit@0.31.4` - Migration tools
  - `pg@8.16.3` - Node-Postgres driver
  - `uuid@10.0.0` - ID generation

### Directory Structure

```
db-postgres/
├── src/                         (Main source, connection, types, proxies)
└── scripts/                     (Migration utilities)
```

### Key Implementation Details

#### 1. Main Entry Point (`src/index.ts`)

**Function**: `postgresAdapter(args: Args): DatabaseAdapterObj<PostgresAdapter>`

The adapter factory function that creates a PostgreSQL database adapter. Key logic:

```typescript
// db-postgres/src/index.ts:68-89
export function postgresAdapter(args: Args) {
  const postgresIDType = args.idType || 'serial'
  const payloadIDType = postgresIDType === 'serial' ? 'number' : 'text'
  // ...

  function adapter({ payload }: { payload: Payload }) {
    const migrationDir = findMigrationDir(args.migrationDir)
    // ...

    // Schema setup - supports custom schema names
    if (args.schemaName) {
      adapterSchema = pgSchema(args.schemaName)
    } else {
      adapterSchema = { enum: pgEnum, table: pgTable }
    }
    // ...
```

**Imports all operations from `@payloadcms/drizzle`** (Lines 3-42):

- CRUD operations: create, find, update, delete
- Versioning: createVersion, findVersions, countVersions
- Transactions: beginTransaction, commitTransaction, rollbackTransaction
- Migrations: migrate, migrateDown, migrateFresh, migrateReset
- Query building: buildQuery, operatorMap

**PostgreSQL-specific imports from `@payloadcms/drizzle/postgres`** (Lines 43-56):

- init, execute, insert, deleteWhere
- createDatabase, dropDatabase, createExtensions
- createJSONQuery, countDistinct
- requireDrizzleKit (for migrations)

**Creates adapter with extensive configuration** (Lines 99-213):

- Connection pooling setup
- Schema generation
- Migration directory
- Transaction options
- Read replicas support
- Custom table name mapping
- Field constraints tracking

#### 2. Type Definitions (`src/types.ts`)

**Key Types**:

```typescript
// db-postgres/src/types.ts:23-79
export type Args = {
  afterSchemaInit?: PostgresSchemaHook[]
  allowIDOnCreate?: boolean
  beforeSchemaInit?: PostgresSchemaHook[]
  blocksAsJSON?: boolean
  // ... many more config options
  pool: PoolConfig
  readReplicas?: string[]
  schemaName?: string
  // ...
}
```

**Adapter Type**:

```typescript
// db-postgres/src/types.ts:93-98
export type PostgresAdapter = {
  drizzle: Drizzle
  pg: PgDependency
  pool: Pool
  // ...
} & BasePostgresAdapter
```

**Module Augmentation** (Lines 100-140):
Extends Payload's DatabaseAdapter interface with PostgreSQL-specific properties.

#### 3. Connection Management (`src/connect.ts`)

**Key Function**: `connect: Connect`

**Connection Features**:

1. **Connection with Auto-Reconnect**:

```typescript
// db-postgres/src/connect.ts:10-45
const connectWithReconnect = async function ({ adapter, pool, reconnect = false }) {
  if (!reconnect) {
    result = await pool.connect()
  } else {
    /** ... try/catch with setTimeout retry */
  }
  // Listen for ECONNRESET errors and reconnect
  result.prependListener('error', (err) => {
    if (err.code === 'ECONNRESET') {
      void connectWithReconnect({ adapter, pool, reconnect: true })
    }
  })
}
```

2. **Drizzle Initialization**:

```typescript
// db-postgres/src/connect.ts:56-79
if (!this.pool) {
  this.pool = new this.pg.Pool(this.poolOptions)
  await connectWithReconnect({ adapter: this, pool: this.pool })
}

this.drizzle = drizzle({ client: this.pool, logger, schema: this.schema })

// Read replicas support
if (this.readReplicaOptions) {
  /** ... map read replicas and call withReplicas */
}
```

3. **Auto Database Creation**:

```typescript
// db-postgres/src/connect.ts:88-106
catch (error) {
  if (err.message?.match(/database .* does not exist/i) && !this.disableCreateDatabase) {
    /** ... create database and retry connection */
  }
}
```

4. **Development Schema Push**:

```typescript
// db-postgres/src/connect.ts:116-123
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.PAYLOAD_MIGRATING !== 'true' &&
  this.push !== false
) {
  await pushDevSchema(this as unknown as DrizzleAdapter)
}
```

5. **Production Migrations**:

```typescript
// db-postgres/src/connect.ts:129-131
if (process.env.NODE_ENV === 'production' && this.prodMigrations) {
  await this.migrate({ migrations: this.prodMigrations })
}
```

### Interface/API for Other Packages

The PostgreSQL adapter exposes these to the Payload core:

**Exported Functions**:

- `postgresAdapter(args: Args)` - Factory function
- `geometryColumn` - Custom geometry column type
- `sql` - SQL template literal from drizzle-orm

**Drizzle Proxy Exports** (for custom schema):

- `@payloadcms/db-postgres/drizzle` - Drizzle instance access
- `@payloadcms/db-postgres/drizzle/pg-core` - PostgreSQL column types
- `@payloadcms/db-postgres/drizzle/node-postgres` - Node-postgres driver
- `@payloadcms/db-postgres/drizzle/relations` - Drizzle relations

### What's Needed vs Bloated

**ESSENTIAL for our CMS**:

- Basic connection management
- CRUD operations (create, find, update, delete)
- Simple query building
- Transaction support
- Connection pooling

**BLOAT we don't need**:

- Versions system (separate \_v tables)
- Drafts system
- Localization support (separate \_locales tables)
- Relationships system (separate \_rels tables)
- Migration system complexity
- Read replicas support
- Multiple ID types (serial vs uuid)
- Schema name customization
- beforeSchemaInit/afterSchemaInit hooks
- Custom table name mapping
- Predefined migrations for version upgrades
- Blocks as JSON option

**Complexity Metrics**:

- Total lines in main files: ~400
- Dependencies: 7 npm packages
- Bloat estimation: ~60% of code supports features we don't need

---

## 2. @payloadcms/drizzle (DETAILED ANALYSIS)

### Package Information

**Location:** `payload-main/packages/drizzle/`

- **Version**: 3.59.1
- **Description**: A library of shared functions used by different payload database adapters
- **Main Dependencies**:
  - `drizzle-orm@0.44.2` - ORM foundation
  - `to-snake-case@1.0.0` - Table/column naming
  - `uuid@9.0.0` - Transaction IDs
  - `dequal@2.0.3` - Deep equality checks

### Directory Structure

```
drizzle/
└── src/
    ├── queries/              (Query building: buildQuery, parseParams, operatorMap)
    ├── schema/               (Schema generation: buildRawSchema, build, traverseFields)
    ├── postgres/             (Postgres-specific: init, execute, schema building)
    ├── sqlite/               (SQLite-specific implementations)
    ├── transactions/         (Transaction management)
    ├── transform/            (Data transformations: read, write)
    ├── upsertRow/            (Row upsert logic)
    ├── utilities/            (Helper functions)
    ├── CRUD Operations       (create, find, update, delete, count)
    ├── Global Operations     (createGlobal, findGlobal, updateGlobal)
    ├── Version Operations    (createVersion, findVersions, etc.)
    └── Migration Operations  (migrate, migrateDown, etc.)
```

### Key Implementation Details

#### 1. Schema Building System (`src/schema/buildRawSchema.ts`)

**Purpose**: Builds an abstract SQL schema from Payload config before converting to Drizzle.

```typescript
// Lines 16-22: Main function
export const buildRawSchema = ({
  adapter,
  setColumnID,
}: {
  adapter: DrizzleAdapter
  setColumnID: SetColumnID
}) => {
```

**Process**:

1. **Create table names**:

```typescript
// drizzle/src/schema/buildRawSchema.ts:25-39
adapter.payload.config.collections.forEach((collection) => {
  createTableName({ adapter, config: collection })

  if (collection.versions) {
    createTableName({
      adapter,
      config: collection,
      versions: true,
      versionsCustomName: true,
    })
  }
})
```

2. **Build collection tables**:

```typescript
// drizzle/src/schema/buildRawSchema.ts:41-90
adapter.payload.config.collections.forEach((collection) => {
  const tableName = adapter.tableNameMap.get(toSnakeCase(collection.slug))

  buildTable({
    adapter,
    fields: collection.flattenedFields,
    tableName,
    // ... more args
  })

  // Build versions table if enabled
  if (collection.versions) {
    /** ... build version table with version fields */
  }
})
```

3. **Build global tables** (Lines 93-135): Similar process for globals

#### 2. Table Building (`src/schema/build.ts`)

**This is the MOST COMPLEX file** - 770 lines of intricate table generation logic.

**Purpose**: Converts Payload fields into abstract SQL table definitions.

**Key Steps**:

1. **Initialize table structure**:

```typescript
// drizzle/src/schema/build.ts:92-114
const columns: Record<string, RawColumn> = baseColumns
const indexes: Record<string, RawIndex> = baseIndexes
const localesColumns: Record<string, RawColumn> = {} // For i18n
const relationships: Set<string> = rootRelationships || new Set()
// ...

const idColType: IDType = setColumnID({ adapter, columns, fields })
```

2. **Traverse fields to build columns**:

```typescript
// drizzle/src/schema/build.ts:116-146
const {
  hasLocalizedField,
  hasManyNumberField,
  hasManyTextField,
  // ... many more returns
} = traverseFields({
  adapter,
  columns,
  fields,
  // ... many more args
})
```

3. **Add timestamps**:

```typescript
// drizzle/src/schema/build.ts:157-177
if (timestamps) {
  columns.createdAt = {
    name: 'created_at',
    type: 'timestamp',
    // ... timestamp config
  }
  // updatedAt similar
}
```

4. **Create locales table** (Lines 188-275):
   If any fields are localized, creates a separate `_locales` table with foreign key to parent.

5. **Create texts table** (Lines 333-428):
   For fields with `hasMany: true` (array of strings), creates a separate `_texts` table.

6. **Create numbers table** (Lines 430-520):
   For numeric array fields, creates a separate `_numbers` table.

7. **Create relationships table** (Lines 522-698):
   For relationship fields, creates a `_rels` table with polymorphic relationship support.

**Example relationships table structure**:

```typescript
// drizzle/src/schema/build.ts:522-698
const relationshipColumns: Record<string, RawColumn> = {
  id: { type: 'serial', primaryKey: true },
  order: { type: 'integer' },
  parent: { type: idColType, notNull: true },
  path: { type: 'varchar', notNull: true },
  // For each relation target:
  usersID: /** ... */,
  postsID: /** ... */,
  // etc.
}
```

#### 3. Query Building System (`src/queries/buildQuery.ts`)

**Purpose**: Builds SQL queries from Payload's query format.

```typescript
// drizzle/src/queries/buildQuery.ts:41-95
export const buildQuery = function buildQuery({
  adapter,
  fields,
  joins = [],
  locale,
  sort,
  tableName,
  where: incomingWhere,
}: BuildQueryArgs): BuildQueryResult {
  const selectFields: Record<string, GenericColumn> = {
    id: adapter.tables[tableName].id,
  }

  let where: SQL

  // Parse where conditions
  if (incomingWhere && Object.keys(incomingWhere).length > 0) {
    where = parseParams({
      /** ... args */
    })
  }

  // Build ORDER BY
  const orderBy = buildOrderBy({
    /** ... args */
  })

  return { joins, orderBy, selectFields, where }
}
```

**Operator Map** (`src/queries/operatorMap.ts`):
Maps Payload operators to SQL:

```typescript
export const operatorMap: Operators = {
  equals: eq,
  not_equals: ne,
  greater_than: gt,
  greater_than_equal: gte,
  less_than: lt,
  less_than_equal: lte,
  like: ilike,
  contains: ilike,
  in: inArray,
  not_in: notInArray,
  exists: isNotNull,
  // ... etc
}
```

#### 4. CRUD Operations

**Find Operation** (`src/find.ts`):

```typescript
// drizzle/src/find.ts:9-46
export const find: Find = async function find(
  this: DrizzleAdapter,
  {
    collection,
    limit,
    locale,
    page = 1,
    sort: sortArg,
    where,
    // ... more args
  },
) {
  const collectionConfig = this.payload.collections[collection].config
  const sort = sortArg !== undefined ? sortArg : collectionConfig.defaultSort
  const tableName = this.tableNameMap.get(toSnakeCase(collectionConfig.slug))

  return findMany({
    adapter: this,
    collectionSlug: collectionConfig.slug,
    fields: collectionConfig.flattenedFields,
    tableName,
    // ... more args
  })
}
```

**Create Operation** (`src/create.ts`):

```typescript
// drizzle/src/create.ts:10-36
export const create: Create = async function create(
  this: DrizzleAdapter,
  { collection: collectionSlug, data, req /** ... */ },
) {
  const db = await getTransaction(this, req)
  const collection = this.payload.collections[collectionSlug].config
  const tableName = this.tableNameMap.get(toSnakeCase(collection.slug))

  const result = await upsertRow({
    adapter: this,
    data,
    db,
    fields: collection.flattenedFields,
    operation: 'create',
    // ... more args
  })

  return result
}
```

#### 5. Transaction System (`src/transactions/beginTransaction.ts`)

**Clever implementation using Promise lifting**:

```typescript
// drizzle/src/transactions/beginTransaction.ts:7-66
export const beginTransaction: BeginTransaction = async function beginTransaction(
  this: DrizzleAdapter,
  options: DrizzleAdapter['transactionOptions'],
) {
  const id = uuid()

  let reject: () => Promise<void>
  let resolve: () => Promise<void>
  let transaction: DrizzleTransaction
  let transactionReady: () => void

  // Drizzle only exposes a transactions API that requires passing `tx` around.
  // We "lift" up the resolve/reject methods to avoid passing tx everywhere
  const done = this.drizzle
    .transaction(async (tx) => {
      transaction = tx
      await new Promise<void>((res, rej) => {
        /** ... setup resolve/reject */
        transactionReady()
      })
    }, options || this.transactionOptions)
    .catch(() => {
      // swallow
    })

  // Wait until transaction is ready
  await new Promise<void>((resolve) => (transactionReady = resolve))

  // Store transaction in sessions map
  this.sessions[id] = { db: transaction, reject, resolve }

  return id
}
```

**How it works**:

1. Drizzle's transaction API requires passing `tx` object around
2. Payload's architecture doesn't pass transaction objects
3. Solution: Store transaction in a sessions map with UUID key
4. Operations retrieve transaction using `getTransaction(adapter, req)`
5. Commit/rollback called via session ID

#### 6. PostgreSQL-Specific Implementation (`src/postgres/init.ts`)

**Initialization process**:

```typescript
// drizzle/src/postgres/init.ts:11-45
export const init: Init = async function init(this: BasePostgresAdapter) {
  this.rawRelations = {}
  this.rawTables = {}

  // Build abstract schema
  buildRawSchema({ adapter: this, setColumnID })

  // Execute beforeSchemaInit hooks
  await executeSchemaHooks({ type: 'beforeSchemaInit', adapter: this })

  // Create locales enum if localization enabled
  if (this.payload.config.localization) {
    /** ... create enum for locales */
  }

  // Build Drizzle tables from raw tables
  for (const tableName in this.rawTables) {
    buildDrizzleTable({ adapter: this, rawTable: this.rawTables[tableName] })
  }

  // Build Drizzle relations
  buildDrizzleRelations({ adapter: this })

  // Execute afterSchemaInit hooks
  await executeSchemaHooks({ type: 'afterSchemaInit', adapter: this })

  // Combine into final schema
  this.schema = {
    /** ... combine tables, relations, enums */
  }
}
```

#### 7. Drizzle Table Building (`src/postgres/schema/buildDrizzleTable.ts`)

**Converts abstract RawTable to concrete Drizzle table**:

```typescript
// drizzle/src/postgres/schema/buildDrizzleTable.ts:39-204
export const buildDrizzleTable = ({
  adapter,
  rawTable,
}: {
  adapter: BasePostgresAdapter
  rawTable: RawTable
}) => {
  const columns: Record<string, any> = {}

  // Build columns
  for (const [key, column] of Object.entries(rawTable.columns)) {
    switch (column.type) {
      case 'enum':
        /** ... create enum column */
        break

      case 'timestamp':
        /** ... create timestamp column with config */
        break

      case 'uuid':
        /** ... create uuid column */
        break

      // ... other types (varchar, integer, jsonb, etc.)
    }

    // Add constraints
    if (column.reference)
      if (column.primaryKey) /** ... add foreign key reference */ columns[key].primaryKey()
    if (column.notNull) columns[key].notNull()
    // ... more constraints
  }

  // Build indexes and foreign keys
  const extraConfig = (cols: any) => {
    const config: Record<string, ForeignKeyBuilder | IndexBuilder> = {}

    if (rawTable.indexes) {
      /** ... build indexes (unique or regular) */
    }

    if (rawTable.foreignKeys) {
      /** ... build foreign key constraints */
    }

    return config
  }

  // Create final Drizzle table
  adapter.tables[rawTable.name] = adapter.pgSchema.table(rawTable.name, columns, extraConfig)
}
```

### Interface/API for Database Adapters

**Exports for db-postgres** (`src/exports/postgres.ts`):

- init, execute, insert, deleteWhere
- createDatabase, dropDatabase, createExtensions
- createJSONQuery, countDistinct
- requireDrizzleKit
- columnToCodeConverter, buildDrizzleTable

**Exports for db-sqlite** (`src/exports/sqlite.ts`):

- Similar set but SQLite-specific implementations

**Main exports** (`src/index.ts`):

- All CRUD operations
- Transaction functions
- Migration functions
- Query building utilities
- Schema building utilities
- Type definitions

### What's Needed vs Bloated

**ESSENTIAL**:

- Basic CRUD operations (create, find, update, delete, count)
- Query building (buildQuery, parseParams, operatorMap)
- Simple schema building (columns, indexes, foreign keys)
- Transaction management
- Connection utilities

**BLOAT**:

- **Versions system** - Entire separate tables and operations
- **Drafts system** - queryDrafts, draft-related queries
- **Localization** - Separate \_locales tables, locale-aware queries
- **Relationships system** - Complex \_rels tables, polymorphic support
- **Array fields** - Separate \_texts and \_numbers tables
- **Migration system** - Multiple migration strategies
- **Schema hooks** - beforeSchemaInit/afterSchemaInit
- **Jobs system** - updateJobs operations
- **Blocks system** - Complex nested block handling
- **Transform layers** - Extensive read/write transformations
- **Upsert complexity** - shouldUseOptimizedUpsertRow, multiple strategies

**Complexity Metrics**:

- Total TypeScript files: ~120+
- Lines of code: ~8,000+
- Bloat estimation: **~70% of code supports features we don't need**

---

## 3. @payloadcms/db-mongodb (BRIEF ANALYSIS)

### Package Information

**Location:** `payload-main/packages/db-mongodb/`

- **Version**: 3.59.1
- **Main Dependencies**:
  - `mongoose@8.15.1` - MongoDB ODM
  - `mongoose-paginate-v2@1.8.5` - Pagination plugin

### Architecture Differences from SQL Adapters

1. **Uses Mongoose ODM** instead of Drizzle ORM
2. **Schema-based** - Defines Mongoose schemas from Payload config
3. **No separate tables** - Uses MongoDB's document structure with embedded arrays
4. **Aggregation pipelines** for complex queries
5. **No separate locales/relationships tables** - Uses embedded documents

### Directory Structure

```
db-mongodb/
└── src/          (Main adapter, connection, schema init, CRUD, queries, transactions)
```

### Key Differences

**No SQL Table Complexity**:

- No separate \_locales, \_rels, \_texts, \_numbers tables
- Uses MongoDB's nested document structure
- Relationships stored as ObjectIds or embedded docs

**Query Building**:

- Uses MongoDB aggregation pipeline
- No SQL joins - uses $lookup
- Simpler than SQL query building

**Why Not Relevant**:
We're using PostgreSQL, not MongoDB, so this adapter is not needed for our simplified CMS.

---

## 4. @payloadcms/db-sqlite (BRIEF ANALYSIS)

### Package Information

**Location:** `payload-main/packages/db-sqlite/`

- **Version**: 3.59.1
- **Main Dependencies**:
  - `@payloadcms/drizzle@workspace:*`
  - `drizzle-orm@0.44.2`
  - `drizzle-kit@0.31.4`
  - `@libsql/client@0.14.0` - SQLite client

### Architecture

**Nearly identical to db-postgres** but:

1. Uses SQLite-specific column types
2. Uses LibSQL client instead of node-postgres
3. Different JSON query syntax (json_extract vs ->)
4. Case-insensitive LIKE operator by default
5. No geometry column support
6. No PostgreSQL extensions

**Implementation**: ~90% shared with db-postgres through @payloadcms/drizzle

### Why Not Relevant

We're using PostgreSQL for production. SQLite might be useful for testing but not for our core CMS.

---

## 5. @payloadcms/db-vercel-postgres (BRIEF ANALYSIS)

### Package Information

**Location:** `payload-main/packages/db-vercel-postgres/`

- **Version**: 3.59.1
- **Main Dependencies**:
  - `@payloadcms/drizzle@workspace:*`
  - `@vercel/postgres@^0.9.0` - Vercel's Postgres SDK
  - `drizzle-orm@0.44.2`
  - `pg@8.16.3` - Still needs node-postgres

### Architecture

**Nearly identical to db-postgres** but:

1. Uses `@vercel/postgres` SDK for connection
2. Optimized for Vercel's hosted Postgres
3. Supports Vercel's connection pooling
4. Otherwise shares all code with db-postgres

### Why Not Relevant

Unless we're deploying to Vercel specifically, standard db-postgres is better. This is a deployment-specific optimization.

---

## 6. @payloadcms/db-d1-sqlite (BRIEF ANALYSIS)

### Package Information

**Location:** `payload-main/packages/db-d1-sqlite/`

- **Version**: 3.59.1
- **Main Dependencies**:
  - `@payloadcms/drizzle@workspace:*`
  - `drizzle-orm@0.44.2`
  - `drizzle-kit@0.31.4`

### Architecture

**SQLite adapter for Cloudflare D1**:

1. Uses Cloudflare D1 as SQLite backend
2. Optimized for edge computing
3. Similar to db-sqlite but for Cloudflare Workers

### Why Not Relevant

We're using PostgreSQL, not Cloudflare D1. Not relevant for our CMS.

---

## Integration with Core Payload

### How Adapters Integrate

1. **Payload Core** (`payload` package):

   ```typescript
   // packages/payload/src/database/types.ts
   interface DatabaseAdapter {
     name: string
     init: (payload: Payload) => Promise<DatabaseAdapter>
     connect: (options?: ConnectOptions) => Promise<void>
     create: (args: CreateArgs) => Promise<Document>
     find: (args: FindArgs) => Promise<{ docs: Document[]; totalDocs: number }>
     // ... all CRUD operations
   }
   ```

2. **Adapter Registration**:

   ```typescript
   // User's payload.config.ts
   export default buildConfig({
     db: postgresAdapter({
       pool: { connectionString: process.env.DATABASE_URI },
     }),
     // ...
   })
   ```

3. **Initialization Flow**:

   ```
   Payload.init()
     → adapter.init(payload)
       → buildRawSchema()
       → buildDrizzleTable()
       → executeSchemaHooks()
     → adapter.connect()
       → createDatabase() if needed
       → pushDevSchema() in dev
       → migrate() in production
   ```

4. **Operation Flow**:
   ```
   payload.find({ collection: 'posts', where: { ... } })
     → adapter.find()
       → buildQuery() from where clause
       → drizzle.select().from().where()
       → transform results
       → return docs
   ```

### Schema Hook System

**Purpose**: Allow customization of generated schema

```typescript
// User's payload.config.ts
db: postgresAdapter({
  afterSchemaInit: [
    ({ adapter, extendTable, schema }) => {
      // Add custom indexes
      schema.tables.posts = extendTable({
        table: schema.tables.posts,
        columns: (cols) => ({
          ...cols,
          search_vector: vector('search_vector', {
            /** ... */
          }),
        }),
        extraConfig: (cols) => ({
          searchIndex: index('search_idx').on(cols.search_vector),
        }),
      })
      return schema
    },
  ],
})
```

---

## Test Overview

### Testing Strategy

**Unit Tests**: Not prominent in these packages

**Integration Tests**: Located in `/test/` directories

- Testing CRUD operations
- Testing query building
- Testing transactions
- Testing migrations
- Testing relationships

**Example Test Structure**:

```typescript
// test/fields/int.spec.ts
describe('Fields', () => {
  it('should create collection', async () => {
    const doc = await payload.create({
      collection: 'posts',
      data: { title: 'Test' },
    })
    expect(doc.id).toBeDefined()
  })
})
```

### Test Complexity

- Tests cover all the bloated features (versions, drafts, localization)
- Tests require full Payload initialization
- Tests use real databases (Postgres, SQLite, MongoDB)
- No clear separation of core vs optional features

---

## Architecture Observations

### Design Patterns

1. **Adapter Pattern**: Clean separation between database engines
2. **Factory Pattern**: `postgresAdapter()` returns adapter factory
3. **Abstract Schema**: RawTable → Drizzle Table conversion
4. **Session Management**: UUID-based transaction tracking
5. **Promise Lifting**: Clever transaction handling without passing tx

### Strengths

- **Database Agnostic**: Easy to swap databases
- **Type Safe**: Extensive TypeScript usage
- **Extensible**: Schema hooks allow customization
- **Well Structured**: Clear separation of concerns

### Weaknesses for Our Use Case

1. **Over-Abstraction**: Multiple layers (Payload → RawTable → Drizzle → SQL)
2. **Feature Bloat**: 70% of code supports features we don't need
3. **Complexity**: ~10,000+ lines of code for what could be ~2,000
4. **Performance**: Multiple transformations, separate tables for arrays
5. **Testing Burden**: Tests cover all bloated features

---

## Recommendations for Simplified CMS

### What to Keep

1. **Basic Adapter Structure**:
   - PostgresAdapter interface
   - Connection management with pooling
   - Transaction support

2. **Core CRUD Operations**:
   - create, find, findOne, updateOne, deleteOne
   - count (for pagination)

3. **Simple Query Building**:
   - buildQuery for WHERE clauses
   - operatorMap for SQL operators
   - Basic JOIN support for relationships

4. **Schema Management**:
   - Simple table creation from config
   - Column types (text, integer, boolean, timestamp, jsonb)
   - Indexes and foreign keys
   - Basic migration support

### What to Remove

1. **Versions System**:
   - Remove all version-related operations
   - Remove `_v` suffix tables
   - Remove countVersions, findVersions, etc.

2. **Drafts System**:
   - Remove queryDrafts
   - Remove draft-related queries

3. **Localization**:
   - Remove `_locales` tables
   - Remove locale-aware queries
   - Store single language only

4. **Complex Relationships**:
   - Remove `_rels` tables
   - Use simple foreign keys instead
   - No polymorphic relationships

5. **Array Fields**:
   - Remove `_texts` and `_numbers` tables
   - Use JSONB for arrays (simpler, faster)

6. **Migration Complexity**:
   - Keep basic migrate up/down
   - Remove migrateFresh, migrateRefresh, migrateReset

7. **Schema Hooks**:
   - Remove beforeSchemaInit/afterSchemaInit
   - Define schema directly

8. **Transform Layers**:
   - Simplify read/write transformations
   - Direct DB ↔ API mapping

### Simplified Architecture

```
Simplified Database Layer:
├── adapter.ts                  (Main adapter, ~200 lines)
├── connection.ts              (Connection pooling, ~100 lines)
├── schema.ts                  (Table definitions, ~200 lines)
├── operations/
│   ├── create.ts             (~50 lines)
│   ├── find.ts               (~100 lines)
│   ├── update.ts             (~50 lines)
│   └── delete.ts             (~30 lines)
├── query/
│   ├── builder.ts            (~150 lines)
│   └── operators.ts          (~50 lines)
└── migrations/
    ├── migrate.ts            (~100 lines)
    └── generator.ts          (~100 lines)

Total: ~1,000 lines vs current ~10,000 lines
```

### Benefits of Simplification

1. **Performance**:
   - Fewer tables = fewer JOINs
   - JSONB for arrays = single query
   - Direct DB mapping = no transformations

2. **Maintainability**:
   - 90% less code to maintain
   - Easier to understand
   - Fewer bugs

3. **Development Speed**:
   - Faster to implement features
   - Easier to debug
   - Simpler testing

4. **Resource Usage**:
   - Fewer tables = less storage
   - Fewer indexes = faster writes
   - Simpler queries = better caching

---

## Code References

### Key Files with Line Numbers

**db-postgres/src/index.ts**:

- Lines 68-89: Adapter configuration setup
- Lines 99-213: Database adapter creation with all operations

**db-postgres/src/connect.ts**:

- Lines 10-45: Auto-reconnect logic
- Lines 56-79: Drizzle initialization and read replicas
- Lines 88-106: Auto database creation
- Lines 116-131: Dev schema push and production migrations

**db-postgres/src/types.ts**:

- Lines 23-79: Args type definition
- Lines 93-98: PostgresAdapter type

**drizzle/src/schema/buildRawSchema.ts**:

- Lines 25-39: Create table names
- Lines 41-90: Build collection tables

**drizzle/src/schema/build.ts**:

- Lines 92-114: Table initialization
- Lines 116-146: Traverse fields to build columns
- Lines 157-177: Add timestamps
- Lines 188-275: Locales table creation
- Lines 333-428: Texts table for array fields
- Lines 430-520: Numbers table for numeric arrays
- Lines 522-698: Relationships table

**drizzle/src/queries/buildQuery.ts**:

- Lines 41-95: Main query builder

**drizzle/src/find.ts**:

- Lines 9-46: Find operation

**drizzle/src/create.ts**:

- Lines 10-36: Create operation using upsertRow

**drizzle/src/transactions/beginTransaction.ts**:

- Lines 7-66: Transaction session management

**drizzle/src/postgres/init.ts**:

- Lines 11-45: Schema initialization process

**drizzle/src/postgres/schema/buildDrizzleTable.ts**:

- Lines 39-204: Convert RawTable to Drizzle table

---

## Conclusion

The PayloadCMS database layer is a sophisticated, well-architected system designed for maximum flexibility and feature completeness. However, for our simplified CMS:

- **70% of the code is bloat** supporting features we don't need
- The **multi-table approach** (locales, texts, numbers, relationships) adds complexity
- **Multiple abstraction layers** slow development and debugging
- **Version, drafts, and localization** systems are completely unnecessary

For our CMS, we should:

1. **Use db-postgres as inspiration**, not implementation
2. **Build a minimal adapter** (~1,000 lines vs ~10,000)
3. **Use JSONB for complex data** instead of separate tables
4. **Keep it simple** - direct mapping, no transformations
5. **Focus on PostgreSQL only** - no database abstraction

The goal is a **lean, fast, maintainable database layer** that does exactly what we need and nothing more.
