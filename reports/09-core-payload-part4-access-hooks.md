# Core Payload Analysis Part 4: Access Control and Hooks System

**Location:** `payload-main/packages/payload/src/` (auth/, collections/, fields/, utilities/)

**Analysis Date**: 2025-10-14
**Payload Version**: 3.x (analyzed from source)
**Focus**: Access control architecture, hooks system, and their integration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Access Control System](#access-control-system)
3. [Hooks System](#hooks-system)
4. [Integration Patterns](#integration-patterns)
5. [Simplification Opportunities](#simplification-opportunities)
6. [Recommendations](#recommendations)

---

## Executive Summary

Payload implements a comprehensive, multi-layered access control system with a powerful hooks architecture. The system combines collection-level, field-level, and operation-level access controls with synchronous/asynchronous access functions that can return boolean values or query constraints (Where clauses). The hooks system provides 13+ hook points throughout the document lifecycle, enabling extensive customization while maintaining data integrity.

### Key Findings

**Access Control Strengths:**
- Multi-level granularity (collection, field, operation)
- Support for both boolean and query-based access (Where constraints)
- Admin access control separate from API access
- Query presets for reusable access patterns
- Field-level read/update access controls

**Hooks System Strengths:**
- Comprehensive coverage of document lifecycle
- Async support throughout
- Rich context passed to all hooks
- Field-level and collection-level hooks
- Proper execution order with error handling

**Integration Strengths:**
- Access control and hooks work together seamlessly
- Request context propagates through all layers
- User context available in all hooks
- Overridable access for internal operations

---

## Access Control System

### 1. Access Control Architecture

#### 1.1 Core Access Types

Payload defines access control through a flexible type system:

```typescript
// From /packages/payload/src/config/types.ts

// Result of access control evaluation
export type AccessResult = boolean | Where

// Access function arguments
export type AccessArgs<TData = any> = {
  id?: number | string
  data?: TData
  req: PayloadRequest
  isReadingStaticFile?: boolean
}

// Access function signature
export type Access<TData = any> = (
  args: AccessArgs<TData>
) => AccessResult | Promise<AccessResult>
```

**Key Design Decision**: Access functions can return:
- `true` - Full access granted
- `false` - Access denied
- `Where` object - Conditional access based on query constraints

This is powerful because it allows query-based access control:

```typescript
// Example: User can only read their own posts
access: {
  read: ({ req: { user } }) => {
    if (!user) return false

    return {
      author: {
        equals: user.id
      }
    }
  }
}
```

#### 1.2 Access Control Layers

**Collection-Level Access** (`/packages/payload/src/collections/config/types.ts`):

```typescript
export type CollectionConfig = {
  access?: {
    admin?: ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean>
    create?: Access
    delete?: Access
    read?: Access
    readVersions?: Access
    unlock?: Access
    update?: Access
  }
}
```

Operations supported:
- `create` - Create new documents
- `read` - Query documents
- `update` - Modify documents
- `delete` - Remove documents
- `readVersions` - Access version history
- `unlock` - Unlock locked documents
- `admin` - Access admin panel (separate from API)

**Global-Level Access** (`/packages/payload/src/globals/config/types.ts`):

```typescript
export type GlobalConfig = {
  access?: {
    read?: Access
    readDrafts?: Access
    readVersions?: Access
    update?: Access
  }
}
```

Globals have fewer operations (no create/delete).

**Field-Level Access** (`/packages/payload/src/fields/config/types.ts`):

```typescript
export type FieldBase = {
  access?: {
    create?: FieldAccess
    read?: FieldAccess
    update?: FieldAccess
  }
}

export type FieldAccess<TData = any, TSiblingData = any> = (
  args: FieldAccessArgs<TData, TSiblingData>
) => boolean | Promise<boolean>

export type FieldAccessArgs<TData = any, TSiblingData = any> = {
  id?: number | string
  data?: Partial<TData>
  doc?: TData
  req: PayloadRequest
  siblingData?: Partial<TSiblingData>
  blockData?: JsonObject | undefined
}
```

**Important**: Field access returns only `boolean`, not `Where` constraints.

#### 1.3 Access Execution Flow

Access control is executed through `executeAccess` function:

```typescript
// From /packages/payload/src/auth/executeAccess.ts

export const executeAccess = async (
  { id, data, disableErrors, isReadingStaticFile = false, req }: OperationArgs,
  access: Access,
): Promise<AccessResult> => {
  if (access) {
    const result = await access({
      id,
      data,
      isReadingStaticFile,
      req,
    })

    if (!result) {
      if (!disableErrors) {
        throw new Forbidden(req.t)
      }
    }

    return result
  }

  // Default: require logged-in user
  if (req.user) {
    return true
  }

  if (!disableErrors) {
    throw new Forbidden(req.t)
  }
  return false
}
```

**Execution Order in Operations**:

1. **beforeOperation hooks** run first
2. **Access control** executes (collection-level)
3. If access returns `Where`, it's combined with user query
4. Database query executed with combined constraints
5. **Field-level access** checked during `afterRead`

Example from `/packages/payload/src/collections/operations/find.ts`:

```typescript
export const findOperation = async (incomingArgs: Arguments) => {
  let args = incomingArgs

  // 1. beforeOperation hooks
  if (args.collection.config.hooks?.beforeOperation?.length) {
    for (const hook of args.collection.config.hooks.beforeOperation) {
      args = (await hook({
        args,
        collection: args.collection.config,
        context: args.req!.context,
        operation: 'read',
        req: args.req!,
      })) || args
    }
  }

  // 2. Access control
  let accessResult: AccessResult
  if (!overrideAccess) {
    accessResult = await executeAccess(
      { disableErrors, req },
      collectionConfig.access.read
    )

    if (accessResult === false) {
      return { docs: [], totalDocs: 0, ... } // Empty result
    }
  }

  // 3. Combine access constraints with user query
  let fullWhere = combineQueries(where!, accessResult!)

  // 4. Execute database query
  result = await payload.db.find({
    collection: collectionConfig.slug,
    where: fullWhere,
    ...
  })

  // 5. Field access in afterRead (see field hooks section)
}
```

#### 1.4 Admin Access Control

Admin access is separate from API access:

```typescript
// From /packages/payload/src/auth/getAccessResults.ts

export async function getAccessResults({ req }: GetAccessResultsArgs) {
  const results = { collections: {}, globals: {} } as Permissions
  const { payload, user } = req

  const isLoggedIn = !!user
  const userCollectionConfig = user && user.collection
    ? payload?.collections?.[user.collection]?.config
    : null

  // Check admin access
  if (userCollectionConfig && payload.config.admin.user === user?.collection) {
    results.canAccessAdmin = userCollectionConfig.access.admin
      ? await userCollectionConfig.access.admin({ req })
      : isLoggedIn
  } else {
    results.canAccessAdmin = false
  }

  // Build permissions for all collections and globals
  await Promise.all(
    payload.config.collections.map(async (collection) => {
      const collectionOperations = ['create', 'read', 'update', 'delete']

      const collectionPolicy = await getEntityPolicies({
        type: 'collection',
        entity: collection,
        operations: collectionOperations,
        req,
      })
      results.collections![collection.slug] = collectionPolicy
    })
  )

  return sanitizePermissions(results)
}
```

**Key Pattern**: Admin access is evaluated once at request time and cached in `req.permissions`.

#### 1.5 Default Access Pattern

```typescript
// From /packages/payload/src/auth/defaultAccess.ts

export const defaultAccess = ({ req: { user } }: { req: PayloadRequest }): boolean =>
  Boolean(user)
```

Simple but effective: require authentication by default.

### 2. Query-Based Access (Where Constraints)

One of Payload's most powerful features is query-based access control.

#### 2.1 Where Constraint Pattern

When access function returns a `Where` object, it's treated as a filter:

```typescript
// Example: Multi-tenant access control
access: {
  read: ({ req: { user } }) => {
    if (!user) return false

    if (user.role === 'admin') {
      return true // Admins see everything
    }

    // Users only see their tenant's data
    return {
      tenant: {
        equals: user.tenant
      }
    }
  }
}
```

The `Where` object becomes part of the database query:

```typescript
// From /packages/payload/src/collections/operations/find.ts

// User query
const userWhere: Where = { status: { equals: 'published' } }

// Access control returns
const accessResult: Where = { tenant: { equals: 'tenant-123' } }

// Combined query
const fullWhere = combineQueries(userWhere, accessResult)
// Result: {
//   and: [
//     { status: { equals: 'published' } },
//     { tenant: { equals: 'tenant-123' } }
//   ]
// }
```

#### 2.2 Query Combining Logic

```typescript
// From /packages/payload/src/database/combineQueries.ts

export function combineQueries(query1: Where, query2: Where): Where {
  if (!query1 && !query2) return {}
  if (!query1) return query2
  if (!query2) return query1

  return {
    and: [query1, query2]
  }
}
```

Simple but effective combining using `and` operator.

#### 2.3 Where Constraints in Practice

From `/packages/payload/src/query-presets/access.ts` - the query presets system:

```typescript
export const getAccess = (config: Config): Record<Operation, Access> =>
  operations.reduce((acc, operation) => {
    acc[operation] = async (args) => {
      const { req } = args

      const collectionAccess = config?.queryPresets?.access?.[operation]
        ? await config.queryPresets.access[operation](args)
        : defaultCollectionAccess?.[operation]
          ? defaultCollectionAccess[operation](args)
          : true

      // If collection-level access is false, deny
      if (collectionAccess === false) {
        return false
      }

      // Create operation doesn't need document-level checks
      if (operation === 'create') {
        return collectionAccess
      }

      // Build query for document-level access
      return {
        and: [
          {
            or: [
              // User-specific access
              ...(req?.user ? [{
                and: [
                  { [`access.${operation}.users`]: { in: [req.user.id] } },
                  { [`access.${operation}.constraint`]: {
                    in: ['onlyMe', 'specificUsers']
                  } }
                ]
              }] : []),
              // Everyone access
              {
                [`access.${operation}.constraint`]: { equals: 'everyone' }
              },
              // Custom constraints
              ...(await Promise.all(
                (config?.queryPresets?.constraints?.[operation] || [])
                  .map(async (constraint) => {
                    const constraintAccess = constraint.access
                      ? await constraint.access(args)
                      : undefined

                    return {
                      and: [
                        ...(typeof constraintAccess === 'object'
                          ? [constraintAccess]
                          : constraintAccess === false
                            ? [{ id: { equals: null } }] // No matches
                            : []
                        ),
                        {
                          [`access.${operation}.constraint`]: {
                            equals: constraint.value
                          }
                        }
                      ]
                    }
                  })
              ))
            ]
          },
          ...(typeof collectionAccess === 'object' ? [collectionAccess] : [])
        ]
      }
    }

    return acc
  }, {} as Record<Operation, Access>)
```

This demonstrates a sophisticated multi-level access pattern with:
- Collection-level base access
- Document-level constraints stored in the document itself
- User-specific permissions
- Custom constraint types

### 3. Field-Level Access Control

Field access is evaluated during `afterRead` and `beforeChange`.

#### 3.1 Read Access

From `/packages/payload/src/fields/hooks/afterRead/promise.ts`:

```typescript
export const promise = async ({
  field,
  siblingDoc,
  doc,
  req,
  overrideAccess,
  triggerAccessControl = true,
  ...args
}: Args): Promise<void> => {
  // ... field processing ...

  // Execute access control
  let allowDefaultValue = true
  if (triggerAccessControl && field.access && field.access.read) {
    const canReadField = overrideAccess
      ? true
      : await field.access.read({
          id: doc.id as number | string,
          blockData,
          data: doc,
          doc,
          req,
          siblingData: siblingDoc,
        })

    if (!canReadField) {
      allowDefaultValue = false
      delete siblingDoc[field.name!]  // Remove field from result
    }
  }

  // Set default value if field missing but accessible
  if (
    !removedFieldValue &&
    allowDefaultValue &&
    typeof siblingDoc[field.name!] === 'undefined' &&
    typeof field.defaultValue !== 'undefined'
  ) {
    siblingDoc[field.name!] = await getDefaultValue({
      defaultValue: field.defaultValue,
      locale: locale!,
      req,
      user: req.user,
      value: siblingDoc[field.name!],
    })
  }
}
```

**Key Pattern**: If field access returns `false`, the field is removed from the document before returning to user.

#### 3.2 Update Access

Field update access would be checked during `beforeChange`, though the code doesn't show explicit field.access.update checks in the beforeChange promise. This suggests update access might be checked at a higher level or during validation.

#### 3.3 Field Access in Nested Structures

Field access traverses nested structures (groups, arrays, blocks):

```typescript
// Arrays
case 'array': {
  const rows = siblingDoc[field.name] as JsonObject

  if (Array.isArray(rows) && rows.length > 0) {
    rows.forEach((row, rowIndex) => {
      traverseFields({
        fields: field.fields,
        siblingDoc: row || {},
        triggerAccessControl,  // Propagates to children
        ...
      })
    })
  }
  break
}

// Blocks
case 'blocks': {
  const rows = siblingDoc[field.name]

  if (Array.isArray(rows)) {
    rows.forEach((row, rowIndex) => {
      const block = findBlock(row.blockType)

      if (block) {
        traverseFields({
          fields: block.fields,
          siblingDoc: row || {},
          triggerAccessControl,  // Propagates to children
          ...
        })
      }
    })
  }
  break
}
```

Access control propagates through all nested structures.

### 4. Permission Calculation

Permissions are calculated once per request and cached.

#### 4.1 Entity Policies

From `/packages/payload/src/utilities/getEntityPolicies.ts`:

```typescript
export async function getEntityPolicies(args: Args) {
  const { id, type, blockPolicies, entity, operations, req } = args
  const { data, locale, payload, user } = req

  const policies = { fields: {} } as ReturnType<T>

  // Build access promises for each operation
  for (const operation of operations) {
    if (typeof entity.access[operation] === 'function') {
      await createAccessPromise({
        access: entity.access[operation],
        accessLevel: 'entity',
        operation,
        policiesObj: policies,
      })
    } else {
      // Default: require login
      (policies as any)[operation] = {
        permission: !!user,
      }
    }

    // Execute field-level policies
    await executeFieldPolicies({
      blockPolicies,
      createAccessPromise,
      entityPermission: (policies as any)[operation].permission,
      fields: entity.fields,
      operation,
      payload,
      policiesObj: policies,
    })
  }

  return policies
}
```

#### 4.2 Field Policies

```typescript
const executeFieldPolicies = async ({
  fields,
  operation,
  createAccessPromise,
  policiesObj,
  ...args
}) => {
  const mutablePolicies = policiesObj.fields as Record<string, any>

  // Fields don't have delete, readVersions, unlock operations
  if (operation === 'delete' || operation === 'readVersions' || operation === 'unlock') {
    return
  }

  await Promise.all(
    fields.map(async (field) => {
      if ('name' in field && field.name) {
        if (!mutablePolicies[field.name]) {
          mutablePolicies[field.name] = {}
        }

        // Check field access
        if ('access' in field && field.access && field.access[operation]) {
          await createAccessPromise({
            access: field.access[operation],
            accessLevel: 'field',
            disableWhere: true,  // Fields can't use Where constraints
            operation,
            policiesObj: mutablePolicies[field.name],
          })
        } else {
          // Inherit from collection
          mutablePolicies[field.name][operation] = {
            permission: (policiesObj as any)[operation]?.permission,
          }
        }

        // Recurse into nested fields
        if ('fields' in field && field.fields) {
          await executeFieldPolicies({
            fields: field.fields,
            operation,
            policiesObj: mutablePolicies[field.name],
            ...args
          })
        }

        // Handle blocks specially (they can be reused)
        if ('blocks' in field || 'blockReferences' in field) {
          await handleBlockPolicies(field, mutablePolicies, args)
        }
      }
    })
  )
}
```

**Key Pattern**: Permissions are calculated recursively for all nested structures and cached to avoid recalculation.

### 5. Access Control Best Practices

#### 5.1 Patterns to Keep

1. **Multi-level granularity** - Collection, field, and operation levels
2. **Query-based access** - Where constraints for complex scenarios
3. **Async support** - All access functions can be async
4. **Default access** - Sensible default (require auth)
5. **Override capability** - `overrideAccess` for internal operations

#### 5.2 Simplification Opportunities

1. **Field access limitations**:
   - Fields can only return boolean, not Where constraints
   - Consider: Should fields support query-based access too?
   - Trade-off: Simplicity vs flexibility

2. **Access function arguments**:
   - Different signatures for collection vs field access
   - Could unify to always include `doc`, `data`, `siblingData`

3. **Permission caching**:
   - Calculated once per request
   - No invalidation within request lifecycle
   - Consider: Real-time permission changes?

4. **Admin vs API access**:
   - Separate `admin` access function
   - Could be simplified to reuse `read` with context flag

---

## Hooks System

### 1. Hook Architecture

Payload provides hooks at three levels:
1. **Collection hooks** - Lifecycle events for documents
2. **Field hooks** - Per-field transformations
3. **Global hooks** (implied but not extensively implemented)

#### 1.1 Collection Hook Types

From `/packages/payload/src/collections/config/types.ts`:

```typescript
export type CollectionConfig = {
  hooks?: {
    // Operation lifecycle
    beforeOperation?: BeforeOperationHook[]
    afterOperation?: AfterOperationHook[]

    // Validation and change
    beforeValidate?: BeforeValidateHook[]
    beforeChange?: BeforeChangeHook[]
    afterChange?: AfterChangeHook[]

    // Read operations
    beforeRead?: BeforeReadHook[]
    afterRead?: AfterReadHook[]

    // Delete operations
    beforeDelete?: BeforeDeleteHook[]
    afterDelete?: AfterDeleteHook[]

    // Auth-specific hooks
    beforeLogin?: BeforeLoginHook[]
    afterLogin?: AfterLoginHook[]
    afterLogout?: AfterLogoutHook[]
    afterMe?: AfterMeHook[]
    afterRefresh?: AfterRefreshHook[]
    afterForgotPassword?: AfterForgotPasswordHook[]
    afterError?: AfterErrorHook[]

    // Custom operation hooks
    me?: MeHook[]
    refresh?: RefreshHook[]
  }
}
```

#### 1.2 Global Hook Types

From `/packages/payload/src/globals/config/types.ts`:

```typescript
export type GlobalConfig = {
  hooks?: {
    beforeOperation?: BeforeOperationHook[]
    afterChange?: AfterChangeHook[]
    afterRead?: AfterReadHook[]
    beforeChange?: BeforeChangeHook[]
    beforeRead?: BeforeReadHook[]
    beforeValidate?: BeforeValidateHook[]
  }
}
```

Globals have fewer hooks (no delete, create operations).

#### 1.3 Field Hook Types

From `/packages/payload/src/fields/config/types.ts`:

```typescript
export type FieldBase = {
  hooks?: {
    afterChange?: FieldHook[]
    afterRead?: FieldHook[]
    beforeChange?: FieldHook[]
    beforeDuplicate?: FieldHook[]
    beforeValidate?: FieldHook[]
  }
}

export type FieldHook<TData = any, TValue = any, TSiblingData = any> = (
  args: FieldHookArgs<TData, TValue, TSiblingData>,
) => Promise<TValue> | TValue

export type FieldHookArgs<TData = any, TValue = any, TSiblingData = any> = {
  // Current value
  value?: TValue
  previousValue?: TValue

  // Document context
  data?: Partial<TData>
  originalDoc?: TData
  previousDoc?: TData
  siblingData: Partial<TSiblingData>
  previousSiblingDoc?: TData

  // Block context (for fields in blocks)
  blockData: JsonObject | undefined

  // Field metadata
  field: FieldAffectingData
  path: (number | string)[]
  schemaPath: string[]
  indexPath: number[]
  siblingFields: (Field | TabAsField)[]

  // Entity context
  collection: null | SanitizedCollectionConfig
  global: null | SanitizedGlobalConfig

  // Operation context
  operation?: 'create' | 'delete' | 'read' | 'update'
  req: PayloadRequest
  context: RequestContext

  // Read-specific
  depth?: number
  currentDepth?: number
  draft?: boolean
  findMany?: boolean
  showHiddenFields?: boolean

  // Access control
  overrideAccess?: boolean
}
```

**Rich Context**: Field hooks receive extensive context about the document, operation, and field location.

### 2. Hook Execution Order

#### 2.1 Create Operation Flow

From `/packages/payload/src/collections/operations/create.ts`:

```typescript
export const createOperation = async (incomingArgs: Arguments) => {
  let args = incomingArgs

  try {
    // 1. Initialize transaction
    const shouldCommit = await initTransaction(args.req)

    // 2. beforeOperation - Collection
    if (args.collection.config.hooks.beforeOperation?.length) {
      for (const hook of args.collection.config.hooks.beforeOperation) {
        args = (await hook({
          args,
          collection: args.collection.config,
          context: args.req.context,
          operation: 'create',
          req: args.req,
        })) || args
      }
    }

    let { data } = args

    // 3. Access control
    if (!overrideAccess) {
      await executeAccess({ data, req }, collectionConfig.access.create)
    }

    // 4. Generate file data (if upload collection)
    const { data: newFileData, files } = await generateFileData({
      collection,
      data,
      operation: 'create',
      req,
    })
    data = newFileData

    // 5. beforeValidate - Fields
    data = await beforeValidate({
      collection: collectionConfig,
      data,
      operation: 'create',
      req,
    })

    // 6. beforeValidate - Collection
    if (collectionConfig.hooks.beforeValidate?.length) {
      for (const hook of collectionConfig.hooks.beforeValidate) {
        data = (await hook({
          collection: collectionConfig,
          context: req.context,
          data,
          operation: 'create',
          req,
        })) || data
      }
    }

    // 7. beforeChange - Collection
    if (collectionConfig.hooks?.beforeChange?.length) {
      for (const hook of collectionConfig.hooks.beforeChange) {
        data = (await hook({
          collection: collectionConfig,
          context: req.context,
          data,
          operation: 'create',
          req,
        })) || data
      }
    }

    // 8. beforeChange - Fields
    const resultWithLocales = await beforeChange({
      collection: collectionConfig,
      data,
      operation: 'create',
      req,
    })

    // 9. Upload files
    await uploadFiles(payload, filesToUpload, req)

    // 10. Database insert
    doc = await payload.db.create({
      collection: collectionConfig.slug,
      data: resultWithLocales,
      req,
    })

    let result = sanitizeInternalFields(doc)

    // 11. Save version (if versioning enabled)
    if (collectionConfig.versions) {
      await saveVersion({
        id: result.id,
        collection: collectionConfig,
        docWithLocales: result,
        operation: 'create',
        payload,
        req,
      })
    }

    // 12. afterRead - Fields
    result = await afterRead({
      collection: collectionConfig,
      doc: result,
      operation: 'read',  // Note: afterRead after create
      req,
    })

    // 13. afterRead - Collection
    if (collectionConfig.hooks?.afterRead?.length) {
      for (const hook of collectionConfig.hooks.afterRead) {
        result = (await hook({
          collection: collectionConfig,
          context: req.context,
          doc: result,
          req,
        })) || result
      }
    }

    // 14. afterChange - Fields
    result = await afterChange({
      collection: collectionConfig,
      data,
      doc: result,
      operation: 'create',
      previousDoc: {},
      req,
    })

    // 15. afterChange - Collection
    if (collectionConfig.hooks?.afterChange?.length) {
      for (const hook of collectionConfig.hooks.afterChange) {
        result = (await hook({
          collection: collectionConfig,
          context: req.context,
          data,
          doc: result,
          operation: 'create',
          previousDoc: {},
          req,
        })) || result
      }
    }

    // 16. afterOperation - Collection
    result = await buildAfterOperation({
      args,
      collection: collectionConfig,
      operation: 'create',
      result,
    })

    // 17. Commit transaction
    if (shouldCommit) {
      await commitTransaction(req)
    }

    return result
  } catch (error) {
    await killTransaction(args.req)
    throw error
  }
}
```

**Key Observations**:

1. **beforeOperation** runs first - can modify entire args
2. **Access control** runs early - before any data processing
3. **Validation hooks** run before database writes
4. **afterRead** runs after create - to populate relationships
5. **afterChange** runs after afterRead
6. **afterOperation** runs last - final chance to modify result
7. **Error handling** - transaction killed on any error

#### 2.2 Find Operation Flow

From `/packages/payload/src/collections/operations/find.ts`:

```typescript
export const findOperation = async (incomingArgs: Arguments) => {
  let args = incomingArgs

  try {
    // 1. beforeOperation - Collection
    if (args.collection.config.hooks?.beforeOperation?.length) {
      for (const hook of args.collection.config.hooks.beforeOperation) {
        args = (await hook({
          args,
          collection: args.collection.config,
          context: args.req!.context,
          operation: 'read',
          req: args.req!,
        })) || args
      }
    }

    // 2. Access control
    let accessResult: AccessResult
    if (!overrideAccess) {
      accessResult = await executeAccess(
        { disableErrors, req },
        collectionConfig.access.read
      )

      if (accessResult === false) {
        return { docs: [], totalDocs: 0, ... }
      }
    }

    // 3. Build and sanitize query
    let fullWhere = combineQueries(where!, accessResult!)
    sanitizeWhereQuery({
      fields: collectionConfig.flattenedFields,
      where: fullWhere
    })

    // 4. Database query
    result = await payload.db.find({
      collection: collectionConfig.slug,
      where: fullWhere,
      limit,
      page,
      sort,
      req,
    })

    // 5. beforeRead - Collection (per document)
    if (collectionConfig?.hooks?.beforeRead?.length) {
      result.docs = await Promise.all(
        result.docs.map(async (doc) => {
          let docRef = doc

          for (const hook of collectionConfig.hooks.beforeRead) {
            docRef = (await hook({
              collection: collectionConfig,
              context: req.context,
              doc: docRef,
              query: fullWhere,
              req,
            })) || docRef
          }

          return docRef
        })
      )
    }

    // 6. afterRead - Fields (per document)
    result.docs = await Promise.all(
      result.docs.map(async (doc) =>
        afterRead({
          collection: collectionConfig,
          doc,
          findMany: true,
          req,
        })
      )
    )

    // 7. afterRead - Collection (per document)
    if (collectionConfig?.hooks?.afterRead?.length) {
      result.docs = await Promise.all(
        result.docs.map(async (doc) => {
          let docRef = doc

          for (const hook of collectionConfig.hooks.afterRead) {
            docRef = (await hook({
              collection: collectionConfig,
              context: req.context,
              doc: docRef,
              findMany: true,
              query: fullWhere,
              req,
            })) || doc
          }

          return docRef
        })
      )
    }

    // 8. afterOperation - Collection
    result = await buildAfterOperation({
      args,
      collection: collectionConfig,
      operation: 'find',
      result,
    })

    return result
  } catch (error) {
    await killTransaction(args.req!)
    throw error
  }
}
```

**Key Differences from Create**:

1. No beforeChange/afterChange (no mutation)
2. beforeRead/afterRead run per document
3. Access control can filter documents via Where
4. No transaction commit (read-only)

### 3. Collection Hooks Deep Dive

#### 3.1 beforeOperation Hook

```typescript
export type BeforeOperationHook = (args: {
  args?: any  // Original operation arguments
  collection: SanitizedCollectionConfig
  context: RequestContext
  operation: HookOperationType
  req: PayloadRequest
}) => any
```

**Purpose**: Modify operation arguments before anything else runs.

**Use cases**:
- Add/modify query parameters
- Set default values based on context
- Logging/analytics
- Request validation

**Example**:
```typescript
beforeOperation: [
  async ({ args, operation, req }) => {
    if (operation === 'read') {
      // Add default sorting
      if (!args.sort) {
        args.sort = '-createdAt'
      }

      // Filter by tenant
      args.where = {
        and: [
          args.where || {},
          { tenant: { equals: req.user.tenant } }
        ]
      }
    }

    return args
  }
]
```

#### 3.2 beforeValidate Hook

```typescript
export type BeforeValidateHook<T = any> = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  data?: Partial<T>
  operation: 'create' | 'update'
  originalDoc?: T
  req: PayloadRequest
}) => any
```

**Purpose**: Transform data before validation runs.

**Use cases**:
- Set computed fields
- Normalize data format
- Add server-generated values

**Example**:
```typescript
beforeValidate: [
  async ({ data, operation, req }) => {
    // Set slug from title
    if (!data.slug && data.title) {
      data.slug = slugify(data.title)
    }

    // Set author on create
    if (operation === 'create' && req.user) {
      data.author = req.user.id
    }

    return data
  }
]
```

#### 3.3 beforeChange Hook

```typescript
export type BeforeChangeHook<T = any> = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  data: Partial<T>
  operation: 'create' | 'update'
  originalDoc?: T
  req: PayloadRequest
}) => any
```

**Purpose**: Final data transformation before database write.

**Key difference from beforeValidate**: Validation has already run, so data is known to be valid.

**Use cases**:
- Hash passwords
- Generate tokens
- Encrypt sensitive fields
- Update timestamps

**Example**:
```typescript
beforeChange: [
  async ({ data, operation, originalDoc }) => {
    // Track changes
    if (operation === 'update') {
      data.lastModified = new Date()

      // Build change log
      const changes = Object.keys(data).filter(
        key => data[key] !== originalDoc[key]
      )

      data.changeLog = [
        ...(originalDoc.changeLog || []),
        {
          timestamp: new Date(),
          fields: changes
        }
      ]
    }

    return data
  }
]
```

#### 3.4 afterChange Hook

```typescript
export type AfterChangeHook<T = any> = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  data: Partial<T>  // Input data
  doc: T            // Saved document
  operation: 'create' | 'update'
  previousDoc: T    // Document before change
  req: PayloadRequest
}) => any
```

**Purpose**: Side effects after successful database write.

**Use cases**:
- Send notifications
- Update related documents
- Clear caches
- Sync to external services
- Trigger webhooks

**Example**:
```typescript
afterChange: [
  async ({ doc, operation, previousDoc, req }) => {
    // Send notifications
    if (operation === 'create') {
      await sendEmail({
        to: doc.author,
        subject: 'Document created',
        body: `Your document "${doc.title}" has been created`
      })
    }

    // Update search index
    await searchService.index(doc)

    // Clear cache
    await cache.del(`doc:${doc.id}`)

    return doc
  }
]
```

#### 3.5 beforeRead Hook

```typescript
export type BeforeReadHook<T = any> = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  doc: T
  query: { [key: string]: any }
  req: PayloadRequest
}) => any
```

**Purpose**: Transform document before field access control.

**Use cases**:
- Decrypt sensitive fields
- Add computed properties
- Modify data based on context

**Important**: Runs before field-level access control, so you can't rely on fields being filtered yet.

#### 3.6 afterRead Hook

```typescript
export type AfterReadHook<T = any> = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  doc: T
  findMany?: boolean
  query?: { [key: string]: any }
  req: PayloadRequest
}) => any
```

**Purpose**: Final transformation before returning to client.

**Use cases**:
- Format data for client
- Add virtual fields
- Mask sensitive data
- Calculate derived values

**Example**:
```typescript
afterRead: [
  async ({ doc, req }) => {
    // Add full URL
    doc.url = `${req.payload.config.serverURL}/posts/${doc.slug}`

    // Calculate reading time
    doc.readingTime = Math.ceil(doc.content.split(' ').length / 200)

    // Mask email for non-owners
    if (doc.author !== req.user?.id) {
      doc.email = doc.email.replace(/(.{2}).*(@.*)/, '$1***$2')
    }

    return doc
  }
]
```

#### 3.7 beforeDelete Hook

```typescript
export type BeforeDeleteHook = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  id: number | string
  req: PayloadRequest
}) => any
```

**Purpose**: Validate or prepare before deletion.

**Use cases**:
- Prevent deletion based on rules
- Archive before delete
- Check dependencies

**Example**:
```typescript
beforeDelete: [
  async ({ id, collection, req }) => {
    // Check if document has dependencies
    const dependents = await req.payload.find({
      collection: 'related',
      where: { parent: { equals: id } }
    })

    if (dependents.totalDocs > 0) {
      throw new Error('Cannot delete: document has dependencies')
    }

    // Archive before delete
    await req.payload.create({
      collection: 'archive',
      data: {
        originalId: id,
        collection: collection.slug,
        archivedAt: new Date()
      }
    })
  }
]
```

#### 3.8 afterDelete Hook

```typescript
export type AfterDeleteHook<T = any> = (args: {
  collection: SanitizedCollectionConfig
  context: RequestContext
  doc: T
  id: number | string
  req: PayloadRequest
}) => any
```

**Purpose**: Cleanup after successful deletion.

**Use cases**:
- Delete related documents
- Clear caches
- Send notifications
- Clean up files

**Example**:
```typescript
afterDelete: [
  async ({ doc, id, req }) => {
    // Delete related documents
    await req.payload.delete({
      collection: 'comments',
      where: { post: { equals: id } }
    })

    // Delete uploaded files
    if (doc.image) {
      await deleteFile(doc.image)
    }

    // Clear caches
    await cache.del(`doc:${id}`)

    // Send notification
    await sendEmail({
      to: doc.author,
      subject: 'Document deleted',
      body: `Your document "${doc.title}" has been deleted`
    })
  }
]
```

#### 3.9 afterOperation Hook

```typescript
export type AfterOperationHook = (
  arg: AfterOperationArg
) => Promise<Result> | Result

export type AfterOperationArg = {
  collection: SanitizedCollectionConfig
  req: PayloadRequest
  args: OperationArguments
  operation: OperationType
  result: OperationResult
}
```

**Purpose**: Final hook after everything else completes.

**Use cases**:
- Analytics/logging
- Transform final result
- Trigger background jobs

**Example**:
```typescript
afterOperation: [
  async ({ operation, result, args, req }) => {
    // Log operation
    await logger.info({
      operation,
      collection: args.collection.slug,
      user: req.user?.id,
      result: operation === 'find' ? result.totalDocs : result.id
    })

    // Queue background job
    if (operation === 'create') {
      await queue.add('process-document', {
        documentId: result.id,
        collection: args.collection.slug
      })
    }

    return result
  }
]
```

### 4. Field Hooks Deep Dive

Field hooks run for every field during document processing.

#### 4.1 beforeValidate Field Hook

```typescript
// From field type definition
hooks?: {
  beforeValidate?: FieldHook[]
}
```

Executed in `/packages/payload/src/fields/hooks/beforeValidate/promise.ts`.

**Purpose**: Set field defaults, transform values before validation.

**Example**:
```typescript
{
  name: 'slug',
  type: 'text',
  hooks: {
    beforeValidate: [
      async ({ value, data, operation }) => {
        // Auto-generate slug from title on create
        if (!value && operation === 'create' && data.title) {
          return slugify(data.title)
        }
        return value
      }
    ]
  }
}
```

#### 4.2 beforeChange Field Hook

Executed in `/packages/payload/src/fields/hooks/beforeChange/promise.ts`:

```typescript
if ('hooks' in field && field.hooks?.beforeChange) {
  for (const hook of field.hooks.beforeChange) {
    const hookedValue = await hook({
      blockData,
      collection,
      context,
      data,
      field,
      global,
      indexPath: indexPathSegments,
      operation,
      originalDoc: doc,
      path: pathSegments,
      previousSiblingDoc: siblingDoc,
      previousValue: siblingDoc[field.name],
      req,
      schemaPath: schemaPathSegments,
      siblingData,
      siblingDocWithLocales,
      siblingFields: siblingFields!,
      value: siblingData[field.name],
    })

    if (hookedValue !== undefined) {
      siblingData[field.name] = hookedValue
    }
  }
}
```

**Key Pattern**: Hook can return undefined to leave value unchanged.

**Example**:
```typescript
{
  name: 'password',
  type: 'text',
  hooks: {
    beforeChange: [
      async ({ value, operation }) => {
        // Hash password on create/update
        if (value && (operation === 'create' || operation === 'update')) {
          return await bcrypt.hash(value, 10)
        }
        return value
      }
    ]
  }
}
```

#### 4.3 afterRead Field Hook

Executed in `/packages/payload/src/fields/hooks/afterRead/promise.ts`:

```typescript
if (triggerHooks && 'hooks' in field && field.hooks?.afterRead) {
  for (const hook of field.hooks.afterRead) {
    const hookedValue = await hook({
      blockData,
      collection,
      context,
      currentDepth,
      data: doc,
      depth,
      draft,
      field,
      findMany,
      global,
      indexPath: indexPathSegments,
      operation: 'read',
      originalDoc: doc,
      overrideAccess,
      path: pathSegments,
      req,
      schemaPath: schemaPathSegments,
      showHiddenFields,
      siblingData: siblingDoc,
      siblingFields: siblingFields!,
      value: siblingDoc[field.name],
    })

    if (hookedValue !== undefined) {
      siblingDoc[field.name] = hookedValue
    }
  }
}
```

**Purpose**: Transform field value after read, access control, and population.

**Example**:
```typescript
{
  name: 'content',
  type: 'richText',
  hooks: {
    afterRead: [
      async ({ value, req }) => {
        // Add full URLs to relative image paths
        if (value) {
          return value.replace(
            /src="\/uploads\//g,
            `src="${req.payload.config.serverURL}/uploads/`
          )
        }
        return value
      }
    ]
  }
}
```

#### 4.4 afterChange Field Hook

Executed in `/packages/payload/src/fields/hooks/afterChange/promise.ts`.

**Purpose**: Side effects after field value saved.

**Example**:
```typescript
{
  name: 'status',
  type: 'select',
  options: ['draft', 'published'],
  hooks: {
    afterChange: [
      async ({ value, previousValue, doc, req }) => {
        // Send notification when published
        if (value === 'published' && previousValue !== 'published') {
          await sendNotification({
            to: doc.author,
            message: `Your post "${doc.title}" is now published`
          })
        }
        return value
      }
    ]
  }
}
```

#### 4.5 beforeDuplicate Field Hook

Special hook for document duplication:

```typescript
{
  name: 'apiKey',
  type: 'text',
  hooks: {
    beforeDuplicate: [
      async ({ value }) => {
        // Generate new API key when duplicating
        return null  // Or generate new key
      }
    ]
  }
}
```

**Purpose**: Handle fields that shouldn't be copied during duplication (unique fields, tokens, etc.).

### 5. Hook Context and Propagation

#### 5.1 Request Context

All hooks receive `req.context` - a custom object for passing data between hooks:

```typescript
export type RequestContext = {
  [key: string]: unknown
}

// Usage in beforeOperation
beforeOperation: [
  async ({ context, req }) => {
    context.startTime = Date.now()
  }
]

// Usage in afterOperation
afterOperation: [
  async ({ context, result }) => {
    const duration = Date.now() - (context.startTime as number)
    logger.info(`Operation took ${duration}ms`)
    return result
  }
]
```

#### 5.2 User Context

All hooks have access to `req.user`:

```typescript
beforeChange: [
  async ({ data, req }) => {
    if (req.user) {
      data.lastModifiedBy = req.user.id
    }
    return data
  }
]
```

#### 5.3 Payload Instance

Access to full Payload API via `req.payload`:

```typescript
afterChange: [
  async ({ doc, req }) => {
    // Create related document
    await req.payload.create({
      collection: 'activity-log',
      data: {
        action: 'document-created',
        documentId: doc.id,
        userId: req.user?.id,
        timestamp: new Date()
      }
    })

    return doc
  }
]
```

### 6. Error Handling in Hooks

#### 6.1 Transaction Rollback

All operations wrap hooks in transactions:

```typescript
export const createOperation = async (incomingArgs: Arguments) => {
  let args = incomingArgs

  try {
    const shouldCommit = await initTransaction(args.req)

    // ... all hooks and operations ...

    if (shouldCommit) {
      await commitTransaction(req)
    }

    return result
  } catch (error: unknown) {
    await killTransaction(args.req)
    throw error
  }
}
```

**Key Pattern**: Any error in any hook will rollback the entire transaction.

#### 6.2 Error Hook

Special hook for error handling:

```typescript
export type AfterErrorHook = (
  args: { collection: SanitizedCollectionConfig } & AfterErrorHookArgs,
) => AfterErrorResult | Promise<AfterErrorResult>

// Usage
hooks: {
  afterError: [
    async ({ error, result, context }) => {
      // Log error
      await logger.error({
        error: error.message,
        stack: error.stack,
        context
      })

      // Optionally modify error response
      return result
    }
  ]
}
```

#### 6.3 Error Propagation

Errors in hooks propagate up and prevent operation:

```typescript
beforeChange: [
  async ({ data, operation, originalDoc }) => {
    // Validate business rule
    if (operation === 'update' && originalDoc.locked) {
      throw new Error('Cannot modify locked document')
    }

    // Validate with external service
    const isValid = await externalValidator.check(data)
    if (!isValid) {
      throw new ValidationError('External validation failed')
    }

    return data
  }
]
```

### 7. Async Hooks

All hooks support async operations:

```typescript
beforeChange: [
  async ({ data, req }) => {
    // Multiple async operations
    const [user, settings] = await Promise.all([
      req.payload.findByID({
        collection: 'users',
        id: req.user.id
      }),
      req.payload.findGlobal({
        slug: 'settings'
      })
    ])

    // Use results
    data.authorName = user.name
    data.siteUrl = settings.siteUrl

    return data
  }
]
```

**Performance Note**: Hooks run sequentially, not in parallel. Be mindful of performance.

### 8. Hook Best Practices

#### 8.1 Patterns to Keep

1. **Rich context** - Hooks receive extensive context
2. **Async support** - All hooks can be async
3. **Multiple hooks** - Array of hooks, run in order
4. **Transaction safety** - Automatic rollback on error
5. **Optional return** - Can return undefined to skip
6. **Field granularity** - Hooks at field level for precision

#### 8.2 Common Pitfalls

1. **Performance**: Sequential execution can be slow
   ```typescript
   // BAD: Sequential
   afterChange: [
     async ({ doc }) => {
       await sendEmail(doc)  // Waits
       await updateCache(doc)  // Waits
       await syncToSearch(doc)  // Waits
     }
   ]

   // GOOD: Parallel
   afterChange: [
     async ({ doc }) => {
       await Promise.all([
         sendEmail(doc),
         updateCache(doc),
         syncToSearch(doc)
       ])
     }
   ]
   ```

2. **Infinite loops**: Careful with hooks that trigger other operations
   ```typescript
   // BAD: Can cause infinite loop
   afterChange: [
     async ({ doc, req }) => {
       await req.payload.update({
         collection: 'same-collection',
         id: doc.id,
         data: { ... }  // Triggers afterChange again!
       })
     }
   ]

   // GOOD: Use context to prevent loop
   afterChange: [
     async ({ doc, req, context }) => {
       if (context.skipAfterChange) return doc

       await req.payload.update({
         collection: 'same-collection',
         id: doc.id,
         data: { ... },
         context: { skipAfterChange: true }
       })
     }
   ]
   ```

3. **Error handling**: Don't swallow errors
   ```typescript
   // BAD: Silent failure
   afterChange: [
     async ({ doc }) => {
       try {
         await sendEmail(doc)
       } catch (err) {
         // Email failed but operation continues
         console.error(err)
       }
       return doc
     }
   ]

   // GOOD: Let it fail or queue retry
   afterChange: [
     async ({ doc }) => {
       try {
         await sendEmail(doc)
       } catch (err) {
         // Queue for retry
         await queue.add('send-email', { docId: doc.id })
       }
       return doc
     }
   ]
   ```

---

## Integration Patterns

### 1. Access Control Using Hooks

#### 1.1 Dynamic Access Based on Document State

```typescript
access: {
  read: async ({ req, id }) => {
    if (!id) return !!req.user  // Listing: require auth

    // Fetch document to check state
    const doc = await req.payload.findByID({
      collection: 'posts',
      id,
      overrideAccess: true
    })

    // Published posts are public
    if (doc.status === 'published') {
      return true
    }

    // Draft posts only visible to author
    return {
      author: {
        equals: req.user?.id
      }
    }
  }
}
```

#### 1.2 Hooks Modifying Access Context

```typescript
hooks: {
  beforeOperation: [
    async ({ args, req, context, operation }) => {
      // Set context for access control
      if (operation === 'read' && req.user?.role === 'viewer') {
        context.viewerMode = true
      }
      return args
    }
  ]
},

access: {
  read: async ({ req }) => {
    // Use context from hook
    if (req.context.viewerMode) {
      return {
        visibility: { equals: 'public' }
      }
    }
    return !!req.user
  }
}
```

### 2. Hooks Modifying Access Results

#### 2.1 Field-Level Access Based on Hook Results

Field access can check values set by earlier hooks:

```typescript
fields: [
  {
    name: 'internalNotes',
    type: 'textarea',
    access: {
      read: ({ doc, req }) => {
        // Only staff can read internal notes
        return req.user?.role === 'staff'
      }
    }
  },
  {
    name: 'sensitiveData',
    type: 'group',
    fields: [
      {
        name: 'ssn',
        type: 'text',
        access: {
          read: ({ doc, req, siblingData }) => {
            // Check if user owns document
            if (doc.userId === req.user?.id) return true

            // Or has admin permission
            return req.user?.role === 'admin'
          }
        }
      }
    ]
  }
]
```

#### 2.2 beforeRead Hook Setting Access Flags

```typescript
hooks: {
  beforeRead: [
    async ({ doc, req }) => {
      // Calculate and set access flag
      doc._canEdit = doc.author === req.user?.id || req.user?.role === 'admin'
      return doc
    }
  ]
},

fields: [
  {
    name: '_canEdit',
    type: 'checkbox',
    admin: {
      hidden: false,
      readOnly: true
    }
  }
]
```

### 3. Request Context Propagation

#### 3.1 Context Flow Through Operations

```typescript
// API endpoint receives request
POST /api/posts

// 1. Create local request with context
const req = await createLocalReq({
  context: { source: 'api', ipAddress: req.ip },
  user: authenticatedUser
}, payload)

// 2. Context available in all hooks
beforeOperation: [
  async ({ context, req }) => {
    console.log(context.source)  // 'api'
    context.operationId = generateId()
  }
]

// 3. Context propagates to nested operations
afterChange: [
  async ({ doc, req, context }) => {
    await req.payload.create({
      collection: 'activity-log',
      data: {
        documentId: doc.id,
        operationId: context.operationId  // From parent
      }
    })
  }
]

// 4. Context available in field hooks
field: {
  hooks: {
    beforeChange: [
      async ({ context, req }) => {
        if (context.source === 'import') {
          // Skip validation for imports
        }
      }
    ]
  }
}
```

#### 3.2 Transaction Context

Transactions are part of the request context:

```typescript
// Start transaction
const req = await createLocalReq({ ...options }, payload)
await initTransaction(req)

// All operations use same transaction
await req.payload.create({ collection: 'posts', data: {...} })
await req.payload.update({ collection: 'users', id: userId, data: {...} })

// Commit or rollback
try {
  await commitTransaction(req)
} catch (err) {
  await killTransaction(req)
}
```

### 4. User Context in Hooks

#### 4.1 User-Based Logic

```typescript
hooks: {
  beforeChange: [
    async ({ data, req, operation }) => {
      // Set owner on create
      if (operation === 'create' && req.user) {
        data.owner = req.user.id
        data.ownerEmail = req.user.email
      }

      // Track editor
      if (operation === 'update' && req.user) {
        data.lastEditedBy = req.user.id
        data.lastEditedAt = new Date()
      }

      return data
    }
  ],

  beforeDelete: [
    async ({ id, req }) => {
      // Only owner can delete
      const doc = await req.payload.findByID({
        collection: 'posts',
        id,
        overrideAccess: true
      })

      if (doc.owner !== req.user?.id) {
        throw new Error('Only owner can delete')
      }
    }
  ]
}
```

#### 4.2 User Context Propagation

```typescript
// Local API with user context
const result = await payload.create({
  collection: 'posts',
  data: { title: 'Test' },
  user: adminUser,  // Set user context
  context: { reason: 'admin-action' }
})

// User available in all hooks
beforeChange: [
  async ({ data, req }) => {
    console.log(req.user.id)  // adminUser.id
    console.log(req.context.reason)  // 'admin-action'
  }
]
```

### 5. Overriding Access in Hooks

#### 5.1 Internal Operations

```typescript
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      // Create audit log with overrideAccess
      await req.payload.create({
        collection: 'audit-logs',
        data: {
          action: 'document-modified',
          documentId: doc.id,
          userId: req.user?.id,
          timestamp: new Date()
        },
        overrideAccess: true  // Bypass access control
      })

      return doc
    }
  ]
}
```

#### 5.2 Conditional Override

```typescript
beforeOperation: [
  async ({ args, req, operation }) => {
    // System operations bypass access
    if (req.context.systemOperation) {
      args.overrideAccess = true
    }
    return args
  }
]
```

### 6. Complex Integration Example

#### 6.1 Multi-Tenant CMS with Audit Logging

```typescript
// Collection configuration
export const Posts: CollectionConfig = {
  slug: 'posts',

  access: {
    // Tenant-scoped read access
    read: async ({ req }) => {
      if (!req.user) return false

      if (req.user.role === 'admin') {
        return true  // Admins see all
      }

      // Users see their tenant's posts
      return {
        tenant: {
          equals: req.user.tenant
        }
      }
    },

    // Only authenticated users can create
    create: ({ req }) => !!req.user,

    // Owner or admin can update
    update: async ({ req, id }) => {
      if (!req.user) return false

      if (req.user.role === 'admin') {
        return true
      }

      // Check ownership
      return {
        and: [
          { tenant: { equals: req.user.tenant } },
          { author: { equals: req.user.id } }
        ]
      }
    }
  },

  hooks: {
    // Set tenant and author on create
    beforeOperation: [
      async ({ args, operation, req }) => {
        if (operation === 'create' && req.user) {
          args.data.tenant = req.user.tenant
          args.data.author = req.user.id
        }
        return args
      }
    ],

    // Validate tenant hasn't changed
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'update') {
          // Prevent tenant changes
          if (data.tenant && data.tenant !== originalDoc.tenant) {
            throw new Error('Cannot change tenant')
          }
        }

        // Track modifications
        data.lastModifiedBy = req.user?.id
        data.lastModifiedAt = new Date()

        return data
      }
    ],

    // Audit logging after successful change
    afterChange: [
      async ({ doc, operation, previousDoc, req, context }) => {
        // Skip audit for internal operations
        if (context.skipAudit) return doc

        // Create audit log entry
        await req.payload.create({
          collection: 'audit-logs',
          data: {
            action: operation,
            collection: 'posts',
            documentId: doc.id,
            userId: req.user?.id,
            tenant: doc.tenant,
            changes: operation === 'update'
              ? calculateChanges(previousDoc, doc)
              : null,
            timestamp: new Date()
          },
          overrideAccess: true,
          context: { skipAudit: true }  // Prevent infinite loop
        })

        return doc
      }
    ],

    // Soft delete logging
    beforeDelete: [
      async ({ id, req }) => {
        // Get document before delete
        const doc = await req.payload.findByID({
          collection: 'posts',
          id,
          overrideAccess: true
        })

        // Archive document
        await req.payload.create({
          collection: 'deleted-posts',
          data: {
            ...doc,
            originalId: id,
            deletedBy: req.user?.id,
            deletedAt: new Date()
          },
          overrideAccess: true
        })
      }
    ]
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true
    },
    {
      name: 'content',
      type: 'richText',
      required: true
    },
    {
      name: 'tenant',
      type: 'text',
      required: true,
      access: {
        // Tenant field is read-only after creation
        update: () => false
      },
      admin: {
        readOnly: true
      }
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        update: () => false  // Author cannot be changed
      }
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        read: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin'
      }
    }
  ]
}

// Helper function
function calculateChanges(before: any, after: any): any[] {
  const changes = []

  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes.push({
        field: key,
        before: before[key],
        after: after[key]
      })
    }
  }

  return changes
}
```

This example demonstrates:
- Multi-level access control (collection + field)
- Query-based access (Where constraints)
- Role-based permissions
- Tenant isolation
- Automatic field population
- Change tracking
- Audit logging
- Soft deletes
- Prevention of infinite loops

---

## Simplification Opportunities

### 1. Access Control Simplifications

#### 1.1 Unify Field and Collection Access Signatures

**Current State**: Different signatures for field vs collection access

```typescript
// Collection access - can return Where
type Access = (args: AccessArgs) => boolean | Where | Promise<...>

// Field access - only boolean
type FieldAccess = (args: FieldAccessArgs) => boolean | Promise<boolean>
```

**Opportunity**: Unify signatures, consider supporting Where for fields

**Pros**:
- Consistent API
- More powerful field-level access

**Cons**:
- Complexity - how to combine field Where with collection Where?
- Performance - would need to filter at field level in app, not DB

**Recommendation**: Keep separate. Field-level Where constraints don't make sense for the use case.

#### 1.2 Simplify Admin Access

**Current State**: Separate `admin` access function

```typescript
access: {
  admin: ({ req }) => req.user?.role === 'admin',
  read: ({ req }) => true,
  // ...
}
```

**Opportunity**: Reuse read access with context flag

```typescript
access: {
  read: ({ req, context }) => {
    if (context.isAdminPanel) {
      return req.user?.role === 'admin'
    }
    return true
  }
}
```

**Pros**:
- Less code duplication
- One place to define access logic

**Cons**:
- Admin access is conceptually different from API access
- Mixing concerns makes code harder to understand

**Recommendation**: Keep separate. The explicitness is valuable.

#### 1.3 Default Access Helper

**Current State**: Need to define access for every operation

**Opportunity**: Provide default access patterns

```typescript
import { defaultAccess, publicRead } from '@payloadcms/helpers'

access: {
  create: defaultAccess,  // Requires auth
  read: publicRead,       // Always true
  update: defaultAccess,
  delete: defaultAccess,
}
```

**Recommendation**: Add helper exports for common patterns.

### 2. Hooks Simplifications

#### 2.1 Hook Execution Performance

**Current State**: Hooks run sequentially

```typescript
for (const hook of collectionConfig.hooks.beforeChange) {
  data = (await hook({ data, ... })) || data
}
```

**Opportunity**: Support parallel hooks when order doesn't matter

```typescript
hooks: {
  beforeChange: {
    sequential: [hook1, hook2],  // Run in order
    parallel: [hook3, hook4]     // Run in parallel
  }
}
```

**Pros**:
- Better performance for independent hooks

**Cons**:
- More complex API
- Need to identify which hooks can be parallel

**Recommendation**: Not worth the complexity. Most hooks need order.

#### 2.2 Conditional Hooks

**Current State**: Hooks run for every operation

```typescript
beforeChange: [
  async ({ data, operation }) => {
    if (operation === 'create') {
      // Only for create
    }
    return data
  }
]
```

**Opportunity**: Define hooks per operation

```typescript
hooks: {
  beforeChange: {
    create: [hook1, hook2],
    update: [hook3]
  }
}
```

**Pros**:
- More explicit
- Skip unnecessary hooks

**Cons**:
- More verbose config
- Breaking change

**Recommendation**: Consider for v4.0. Current pattern works but is verbose.

#### 2.3 Hook Error Context

**Current State**: Error loses operation context

```typescript
beforeChange: [
  async ({ data }) => {
    throw new Error('Validation failed')  // No context
  }
]
```

**Opportunity**: Provide error context helper

```typescript
import { HookError } from '@payloadcms/errors'

beforeChange: [
  async ({ data, operation, req }) => {
    throw new HookError('Validation failed', {
      operation,
      collection: 'posts',
      userId: req.user?.id,
      field: 'title'
    })
  }
]
```

**Recommendation**: Add HookError class with rich context.

### 3. Integration Simplifications

#### 3.1 Transaction API

**Current State**: Manual transaction management

```typescript
const req = await createLocalReq(options, payload)
await initTransaction(req)
try {
  // operations
  await commitTransaction(req)
} catch (err) {
  await killTransaction(req)
  throw err
}
```

**Opportunity**: Transaction helper

```typescript
await payload.transaction(async (req) => {
  await req.payload.create({ ... })
  await req.payload.update({ ... })
  // Auto-commits on success, rolls back on error
})
```

**Recommendation**: Add transaction helper for better DX.

#### 3.2 Context Builder

**Current State**: Manual context setup

```typescript
const req = await createLocalReq({
  context: {
    source: 'api',
    userId: user.id,
    // ... manual setup
  }
}, payload)
```

**Opportunity**: Context builder

```typescript
const req = await createLocalReq(payload)
  .withUser(user)
  .withContext('source', 'api')
  .withTransaction()
  .build()
```

**Recommendation**: Consider fluent API for better DX.

### 4. Essential vs Nice-to-Have Features

#### 4.1 Essential Features (Keep)

**Access Control**:
- ✅ Multi-level access (collection, field, operation)
- ✅ Query-based access (Where constraints)
- ✅ Async access functions
- ✅ Default access pattern
- ✅ Override capability

**Hooks**:
- ✅ beforeOperation / afterOperation
- ✅ beforeValidate / beforeChange / afterChange
- ✅ beforeRead / afterRead
- ✅ beforeDelete / afterDelete
- ✅ Field-level hooks
- ✅ Transaction support
- ✅ Error handling
- ✅ Request context propagation

#### 4.2 Nice-to-Have Features (Consider Simplifying)

**Access Control**:
- ⚠️ Admin access (could reuse read)
- ⚠️ Unlock access (niche feature)
- ⚠️ Query presets (complex, limited use)

**Hooks**:
- ⚠️ Auth-specific hooks (could be generic)
- ⚠️ beforeDuplicate (niche feature)
- ⚠️ afterError (rarely used)

**Integration**:
- ⚠️ Lock documents (complex, limited use)
- ⚠️ Version-specific access (adds complexity)

---

## Recommendations

### 1. For Tiny CMS Implementation

#### 1.1 Core Access System

**Implement**:
```typescript
// Simple 3-level access
type Access = {
  // Collection level
  collections: {
    [slug: string]: {
      create?: AccessFn
      read?: AccessFn
      update?: AccessFn
      delete?: AccessFn
    }
  }

  // Field level
  fields: {
    [path: string]: {
      read?: FieldAccessFn
      update?: FieldAccessFn
    }
  }

  // Global admin access
  admin?: AccessFn
}

// Access function
type AccessFn = (ctx: AccessContext) => boolean | Where | Promise<...>
type AccessContext = {
  user?: User
  data?: any
  doc?: any
  req: Request
}
```

**Skip**:
- Unlock access
- ReadVersions access (until versioning implemented)
- Query presets (too complex for v1)

#### 1.2 Core Hooks System

**Implement (Priority 1)**:
```typescript
hooks: {
  // High-value hooks
  beforeChange?: Hook[]   // Data transformation
  afterChange?: Hook[]    // Side effects
  beforeRead?: Hook[]     // Pre-processing
  afterRead?: Hook[]      // Post-processing
}
```

**Implement (Priority 2)**:
```typescript
hooks: {
  beforeValidate?: Hook[]  // Set defaults
  beforeDelete?: Hook[]    // Validation
  afterDelete?: Hook[]     // Cleanup
}
```

**Skip for v1**:
- beforeOperation / afterOperation (too generic)
- Auth-specific hooks (not needed yet)
- beforeDuplicate (niche)
- afterError (use global error handler)

#### 1.3 Field Hooks

**Implement**:
```typescript
field: {
  hooks: {
    beforeChange?: FieldHook[]  // Transform value
    afterRead?: FieldHook[]     // Format for client
  }
}
```

**Skip for v1**:
- beforeValidate (can use beforeChange)
- afterChange (can use collection afterChange)
- beforeDuplicate (niche)

### 2. Implementation Strategy

#### 2.1 Phase 1: Basic Access Control

1. Implement collection-level access
2. Support boolean return values
3. Default to require auth
4. Add override capability

#### 2.2 Phase 2: Query-Based Access

1. Implement Where constraints
2. Add query combining logic
3. Test with multi-tenant scenarios

#### 2.3 Phase 3: Field-Level Access

1. Implement field read access
2. Implement field update access
3. Add field access traversal

#### 2.4 Phase 4: Core Hooks

1. Implement beforeChange / afterChange
2. Implement beforeRead / afterRead
3. Add transaction support
4. Add error handling

#### 2.5 Phase 5: Field Hooks

1. Implement field beforeChange
2. Implement field afterRead
3. Test with nested structures

### 3. Testing Strategy

#### 3.1 Access Control Tests

```typescript
describe('Access Control', () => {
  test('boolean access - granted', async () => {
    const result = await payload.find({
      collection: 'posts',
      user: authenticatedUser
    })
    expect(result.docs.length).toBeGreaterThan(0)
  })

  test('boolean access - denied', async () => {
    await expect(
      payload.find({
        collection: 'posts',
        user: null
      })
    ).rejects.toThrow(Forbidden)
  })

  test('query-based access - filters results', async () => {
    const result = await payload.find({
      collection: 'posts',
      user: tenantUser
    })

    // All results should be from user's tenant
    expect(result.docs.every(
      doc => doc.tenant === tenantUser.tenant
    )).toBe(true)
  })

  test('field access - removes unauthorized fields', async () => {
    const doc = await payload.findByID({
      collection: 'posts',
      id: postId,
      user: regularUser
    })

    expect(doc.internalNotes).toBeUndefined()
  })
})
```

#### 3.2 Hooks Tests

```typescript
describe('Hooks', () => {
  test('beforeChange - transforms data', async () => {
    const result = await payload.create({
      collection: 'posts',
      data: { title: 'Test' }
    })

    // Hook should have set slug
    expect(result.slug).toBe('test')
  })

  test('afterChange - side effects', async () => {
    await payload.create({
      collection: 'posts',
      data: { title: 'Test' }
    })

    // Hook should have created audit log
    const logs = await payload.find({
      collection: 'audit-logs',
      where: { action: { equals: 'create' } }
    })

    expect(logs.totalDocs).toBeGreaterThan(0)
  })

  test('hooks run in order', async () => {
    const order = []

    await payload.create({
      collection: 'test-collection',
      data: { value: 'test' },
      context: { captureOrder: order }
    })

    expect(order).toEqual([
      'beforeValidate',
      'beforeChange',
      'afterRead',
      'afterChange'
    ])
  })

  test('hook error rolls back transaction', async () => {
    await expect(
      payload.create({
        collection: 'posts',
        data: { triggerError: true }
      })
    ).rejects.toThrow()

    // Document should not exist
    const result = await payload.find({
      collection: 'posts',
      where: { triggerError: { equals: true } }
    })

    expect(result.totalDocs).toBe(0)
  })
})
```

### 4. Documentation Needs

#### 4.1 Access Control Guide

- Explain 3 levels of access
- Boolean vs Where patterns
- Common use cases (public, authenticated, owner-only, role-based)
- Multi-tenant example
- Performance considerations

#### 4.2 Hooks Guide

- Hook execution order
- When to use each hook type
- Field vs collection hooks
- Common patterns
- Performance tips
- Error handling
- Testing hooks

#### 4.3 Integration Guide

- Access + hooks patterns
- Request context usage
- Transaction handling
- User context propagation
- Override access safely

---

## Conclusion

Payload's access control and hooks system is comprehensive and powerful, providing fine-grained control at multiple levels while maintaining good ergonomics. The system is well-architected with clear separation between access control (what can be accessed) and hooks (how data is transformed/processed).

### Key Strengths to Preserve

1. **Multi-level access control** - Collection, field, and operation levels provide necessary granularity
2. **Query-based access** - Where constraints enable complex scenarios like multi-tenancy
3. **Rich hook system** - Comprehensive lifecycle coverage with good context
4. **Transaction safety** - Automatic rollback on errors
5. **Async throughout** - All access and hooks can be async
6. **Override capability** - Essential for internal operations

### Recommended Simplifications

1. **Skip niche features initially** - unlock access, query presets, version-specific access
2. **Consolidate auth hooks** - Auth hooks can be generic beforeChange/afterChange
3. **Limit hook types** - Focus on core lifecycle hooks (before/after change/read/delete)
4. **Helper utilities** - Add transaction helpers, context builders, default access patterns

### Implementation Priority

**Phase 1 (Essential)**:
- Collection-level access (boolean + Where)
- Field-level read access
- beforeChange / afterChange hooks
- afterRead hook

**Phase 2 (Important)**:
- Field-level update access
- beforeRead hook
- Delete hooks
- Field hooks

**Phase 3 (Nice-to-have)**:
- beforeValidate hook
- Admin access
- Advanced patterns

This analysis should provide a solid foundation for implementing access control and hooks in Tiny CMS while learning from Payload's mature system.
