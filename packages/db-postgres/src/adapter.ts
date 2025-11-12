/**
 * Kysely PostgreSQL adapter for tiny-cms
 * Simplified database adapter using Kysely ORM
 */

import { Kysely, PostgresDialect, sql, type Insertable } from 'kysely'
import { Pool, type PoolConfig } from 'pg'
import type {
  DatabaseAdapter,
  FindOptions,
  FindResult,
  TableColumn,
  TableChanges,
  Collection,
} from '@tiny-cms/core'

// Database table type (generic to support any collection)
type AnyTable = Record<string, unknown>

export interface KyselyAdapterOptions {
  pool: PoolConfig
  /**
   * Table name transformer (e.g., convert 'posts' to 'posts' or 'cms_posts')
   * Default: no transformation
   */
  tablePrefix?: string
}

export class KyselyPostgresAdapter implements DatabaseAdapter {
  name = 'postgres'
  private db: Kysely<Record<string, AnyTable>>
  private pool: Pool
  private tablePrefix: string

  constructor(options: KyselyAdapterOptions) {
    this.tablePrefix = options.tablePrefix || ''
    this.pool = new Pool(options.pool)

    this.db = new Kysely({
      dialect: new PostgresDialect({
        pool: this.pool,
      }),
    })
  }

  /**
   * Get the full table name with prefix
   */
  private getTableName(collection: string): string {
    return this.tablePrefix ? `${this.tablePrefix}${collection}` : collection
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    // Test connection
    try {
      await this.db
        .selectFrom(sql`pg_catalog.pg_tables`.as('t'))
        .select(sql`1`.as('test'))
        .limit(1)
        .execute()
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${(error as Error).message}`)
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.db.destroy()
    await this.pool.end()
  }

  /**
   * Create a new document
   */
  async create(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const tableName = this.getTableName(collection)

    // Add createdAt and updatedAt timestamps
    const dataWithTimestamps = {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const result = await this.db
      .insertInto(tableName as never)
      .values(dataWithTimestamps as Insertable<never>)
      .returningAll()
      .executeTakeFirstOrThrow()

    return this.camelCaseKeys(result as Record<string, unknown>)
  }

  /**
   * Find documents with query options
   */
  async find(collection: string, options: FindOptions = {}): Promise<FindResult> {
    const tableName = this.getTableName(collection)
    const { where, orderBy, limit = 10, offset = 0 } = options

    // Build the query
    let query = this.db.selectFrom(tableName as never).selectAll()

    // Apply where clause
    if (where) {
      query = this.applyWhereClause(query, where)
    }

    // Apply ordering
    if (orderBy) {
      for (const [field, direction] of Object.entries(orderBy)) {
        const snakeField = this.toSnakeCase(field)
        query = query.orderBy(snakeField as never, direction)
      }
    }

    // Apply pagination
    query = query.limit(limit).offset(offset)

    // Execute query
    const docs = await query.execute()

    // Count total documents
    let countQuery = this.db.selectFrom(tableName as never).select(sql`count(*)`.as('count'))

    if (where) {
      countQuery = this.applyWhereClause(countQuery, where)
    }

    const countResult = (await countQuery.executeTakeFirst()) as { count: string } | undefined
    const totalDocs = countResult ? parseInt(countResult.count, 10) : 0

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalDocs / limit)
    const page = Math.floor(offset / limit) + 1
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return {
      docs: docs.map((doc) => this.camelCaseKeys(doc as Record<string, unknown>)) as never[],
      totalDocs,
      limit,
      offset,
      totalPages,
      page,
      hasNextPage,
      hasPrevPage,
    }
  }

  /**
   * Find a document by ID
   */
  async findById(collection: string, id: string): Promise<Record<string, unknown> | null> {
    const tableName = this.getTableName(collection)

    const result = await this.db
      .selectFrom(tableName as never)
      .selectAll()
      .where('id' as never, '=', id as never)
      .executeTakeFirst()

    if (!result) {
      return null
    }

    return this.camelCaseKeys(result as Record<string, unknown>)
  }

  /**
   * Update a document by ID
   */
  async update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const tableName = this.getTableName(collection)

    // Add updated timestamp
    const dataWithTimestamp = {
      ...data,
      updated_at: new Date(),
    }

    // Convert to snake_case
    const snakeCaseData = this.toSnakeCaseObject(dataWithTimestamp)

    const result = await this.db
      .updateTable(tableName as never)
      .set(snakeCaseData as never)
      .where('id' as never, '=', id as never)
      .returningAll()
      .executeTakeFirstOrThrow()

    return this.camelCaseKeys(result as Record<string, unknown>)
  }

  /**
   * Delete a document by ID
   */
  async delete(collection: string, id: string): Promise<void> {
    const tableName = this.getTableName(collection)

    await this.db
      .deleteFrom(tableName as never)
      .where('id' as never, '=', id as never)
      .execute()
  }

  /**
   * Count documents
   */
  async count(collection: string, options: FindOptions = {}): Promise<number> {
    const tableName = this.getTableName(collection)
    const { where } = options

    let query = this.db.selectFrom(tableName as never).select(sql`count(*)`.as('count'))

    if (where) {
      query = this.applyWhereClause(query, where)
    }

    const result = (await query.executeTakeFirst()) as { count: string } | undefined

    return result ? parseInt(result.count, 10) : 0
  }

  /**
   * Apply where clause to a query
   * Simplified implementation - supports basic operators only
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyWhereClause(query: any, where: Record<string, unknown>): any {
    for (const [key, value] of Object.entries(where)) {
      const snakeKey = this.toSnakeCase(key)

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Handle operators like { equals, in, gt, lt, etc. }
        const operators = value as Record<string, unknown>

        for (const [op, opValue] of Object.entries(operators)) {
          switch (op) {
            case 'equals':
              query = query.where(snakeKey, '=', opValue)
              break
            case 'not':
              query = query.where(snakeKey, '!=', opValue)
              break
            case 'in':
              query = query.where(snakeKey, 'in', opValue as never[])
              break
            case 'notIn':
              query = query.where(snakeKey, 'not in', opValue as never[])
              break
            case 'lt':
              query = query.where(snakeKey, '<', opValue)
              break
            case 'lte':
              query = query.where(snakeKey, '<=', opValue)
              break
            case 'gt':
              query = query.where(snakeKey, '>', opValue)
              break
            case 'gte':
              query = query.where(snakeKey, '>=', opValue)
              break
            case 'contains':
              query = query.where(snakeKey, 'ilike', `%${opValue}%`)
              break
            case 'startsWith':
              query = query.where(snakeKey, 'ilike', `${opValue}%`)
              break
            case 'endsWith':
              query = query.where(snakeKey, 'ilike', `%${opValue}`)
              break
          }
        }
      } else {
        // Simple equality check
        query = query.where(snakeKey, '=', value)
      }
    }

    return query
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }

  /**
   * Convert object keys to snake_case
   */
  private toSnakeCaseObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      result[this.toSnakeCase(key)] = value
    }

    return result
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  /**
   * Convert object keys to camelCase
   */
  private camelCaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      result[this.toCamelCase(key)] = value
    }

    return result
  }

  /**
   * Execute raw SQL query
   * Useful for advanced operations like full-text search
   */
  async query<T = Record<string, unknown>>(sqlQuery: string, _params?: unknown[]): Promise<T[]> {
    // Use Kysely's sql template tag for raw queries
    // For now, we only support non-parameterized queries
    // In production, you'd use sql.val() or proper parameter binding
    const query = sql.raw(sqlQuery)

    const result = await query.execute(this.db)
    return result.rows as T[]
  }

  /**
   * Create an index on collection fields
   * Supports different index types for PostgreSQL
   */
  async createIndex(
    collection: string,
    fields: string[],
    type: 'btree' | 'gin' | 'gist' = 'btree',
  ): Promise<void> {
    const tableName = this.getTableName(collection)
    const snakeFields = fields.map((f) => this.toSnakeCase(f))
    const indexName = `${tableName}_${snakeFields.join('_')}_idx`

    // Build index creation SQL
    const fieldList = snakeFields.join(', ')

    await sql`
      CREATE INDEX IF NOT EXISTS ${sql.raw(indexName)}
      ON ${sql.raw(tableName)}
      USING ${sql.raw(type)} (${sql.raw(fieldList)})
    `.execute(this.db)
  }

  /**
   * Schema operations for database management
   */
  schema = {
    /**
     * Create a table with columns
     */
    createTable: async (tableName: string, columns: TableColumn[]): Promise<void> => {
      const fullTableName = this.getTableName(tableName)

      // Build CREATE TABLE statement
      let createTableQuery = `CREATE TABLE IF NOT EXISTS ${fullTableName} (`

      const columnDefinitions = columns.map((col) => {
        const snakeName = this.toSnakeCase(col.name)
        let def = `${snakeName} ${this.mapColumnType(col.type)}`

        if (col.primaryKey) def += ' PRIMARY KEY'
        if (col.notNull) def += ' NOT NULL'
        if (col.unique) def += ' UNIQUE'
        if (col.defaultValue !== undefined) {
          if (col.type === 'text' && typeof col.defaultValue === 'string') {
            def += ` DEFAULT '${col.defaultValue}'`
          } else if (col.type === 'timestamp' && col.defaultValue === 'now') {
            def += ` DEFAULT CURRENT_TIMESTAMP`
          } else {
            def += ` DEFAULT ${col.defaultValue}`
          }
        }
        if (col.references) {
          const refTable = this.getTableName(col.references.table)
          const refCol = this.toSnakeCase(col.references.column)
          def += ` REFERENCES ${refTable}(${refCol})`
        }

        return def
      })

      createTableQuery += columnDefinitions.join(', ') + ')'

      await sql.raw(createTableQuery).execute(this.db)
    },

    /**
     * Drop a table
     */
    dropTable: async (tableName: string): Promise<void> => {
      const fullTableName = this.getTableName(tableName)
      await sql.raw(`DROP TABLE IF EXISTS ${fullTableName} CASCADE`).execute(this.db)
    },

    /**
     * Check if a table exists
     */
    tableExists: async (tableName: string): Promise<boolean> => {
      const fullTableName = this.getTableName(tableName)

      const result = await sql<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = ${fullTableName}
        ) as exists
      `.execute(this.db)

      return result.rows[0]?.exists || false
    },

    /**
     * Alter table (add/drop columns, change types, etc.)
     */
    alterTable: async (tableName: string, changes: TableChanges): Promise<void> => {
      const fullTableName = this.getTableName(tableName)

      // Add columns
      if (changes.addColumns) {
        for (const col of changes.addColumns) {
          const snakeName = this.toSnakeCase(col.name)
          let alterQuery = `ALTER TABLE ${fullTableName} ADD COLUMN IF NOT EXISTS ${snakeName} ${this.mapColumnType(col.type)}`

          if (col.notNull) alterQuery += ' NOT NULL'
          if (col.unique) alterQuery += ' UNIQUE'
          if (col.defaultValue !== undefined) {
            if (col.type === 'text' && typeof col.defaultValue === 'string') {
              alterQuery += ` DEFAULT '${col.defaultValue}'`
            } else if (col.type === 'timestamp' && col.defaultValue === 'now') {
              alterQuery += ` DEFAULT CURRENT_TIMESTAMP`
            } else {
              alterQuery += ` DEFAULT ${col.defaultValue}`
            }
          }

          await sql.raw(alterQuery).execute(this.db)
        }
      }

      // Drop columns
      if (changes.dropColumns) {
        for (const colName of changes.dropColumns) {
          const snakeName = this.toSnakeCase(colName)
          await sql
            .raw(`ALTER TABLE ${fullTableName} DROP COLUMN IF EXISTS ${snakeName}`)
            .execute(this.db)
        }
      }

      // Rename columns
      if (changes.renameColumns) {
        for (const rename of changes.renameColumns) {
          const fromSnake = this.toSnakeCase(rename.from)
          const toSnake = this.toSnakeCase(rename.to)
          await sql
            .raw(`ALTER TABLE ${fullTableName} RENAME COLUMN ${fromSnake} TO ${toSnake}`)
            .execute(this.db)
        }
      }

      // Alter columns (change type, constraints, etc.)
      if (changes.alterColumns) {
        for (const col of changes.alterColumns) {
          const snakeName = this.toSnakeCase(col.name)

          // Change type
          await sql
            .raw(
              `ALTER TABLE ${fullTableName} ALTER COLUMN ${snakeName} TYPE ${this.mapColumnType(col.type)}`,
            )
            .execute(this.db)

          // Change NULL constraint
          if (col.notNull) {
            await sql
              .raw(`ALTER TABLE ${fullTableName} ALTER COLUMN ${snakeName} SET NOT NULL`)
              .execute(this.db)
          } else {
            await sql
              .raw(`ALTER TABLE ${fullTableName} ALTER COLUMN ${snakeName} DROP NOT NULL`)
              .execute(this.db)
          }
        }
      }
    },

    /**
     * Run raw migration SQL
     */
    runMigration: async (sqlQuery: string): Promise<void> => {
      await sql.raw(sqlQuery).execute(this.db)
    },

    /**
     * Create tables for collections based on config
     */
    setupCollectionTables: async (collections: Collection[]): Promise<void> => {
      for (const collection of collections) {
        const tableName = collection.slug || collection.name

        // Basic columns that every collection should have
        const columns: TableColumn[] = [
          { name: 'id', type: 'uuid', primaryKey: true, defaultValue: 'gen_random_uuid()' },
          { name: 'createdAt', type: 'timestamp', notNull: true, defaultValue: 'now' },
          { name: 'updatedAt', type: 'timestamp', notNull: true, defaultValue: 'now' },
        ]

        // Add fields from collection definition
        for (const field of collection.fields) {
          const column: TableColumn = {
            name: field.name,
            type: this.mapFieldTypeToColumnType(field.type),
            notNull: field.required || false,
          }

          if (field.unique) {
            column.unique = true
          }

          columns.push(column)
        }

        // Create the table
        await this.schema.createTable(tableName, columns)

        // Create indexes if specified
        if (collection.indexes) {
          for (const index of collection.indexes) {
            await this.createIndex(tableName, index.fields, index.type || 'btree')
          }
        }
      }
    },
  }

  /**
   * Map our column types to PostgreSQL types
   */
  private mapColumnType(type: TableColumn['type']): string {
    switch (type) {
      case 'text':
        return 'TEXT'
      case 'integer':
        return 'INTEGER'
      case 'boolean':
        return 'BOOLEAN'
      case 'json':
        return 'JSONB'
      case 'timestamp':
        return 'TIMESTAMP'
      case 'uuid':
        return 'UUID'
      case 'decimal':
        return 'DECIMAL'
      default:
        return 'TEXT'
    }
  }

  /**
   * Map field types to column types
   */
  private mapFieldTypeToColumnType(fieldType: string): TableColumn['type'] {
    switch (fieldType) {
      case 'text':
      case 'richText':
      case 'email':
      case 'select':
      case 'radio':
        return 'text'
      case 'number':
        return 'decimal'
      case 'checkbox':
        return 'boolean'
      case 'json':
      case 'array':
      case 'blocks':
        return 'json'
      case 'date':
        return 'timestamp'
      case 'relationship':
        return 'uuid'
      default:
        return 'text'
    }
  }
}

/**
 * Factory function to create a Kysely adapter
 */
export function postgresAdapter(options: KyselyAdapterOptions): DatabaseAdapter {
  return new KyselyPostgresAdapter(options)
}
