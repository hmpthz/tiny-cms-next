/**
 * Kysely PostgreSQL adapter for tiny-cms
 * Simplified database adapter using Kysely ORM
 */

import { Kysely, PostgresDialect, sql, type Insertable } from 'kysely'
import { Pool, type PoolConfig } from 'pg'
import type { DatabaseAdapter, FindOptions, FindResult } from '@tiny-cms/core'

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
}

/**
 * Factory function to create a Kysely adapter
 */
export function postgresAdapter(options: KyselyAdapterOptions): DatabaseAdapter {
  return new KyselyPostgresAdapter(options)
}
