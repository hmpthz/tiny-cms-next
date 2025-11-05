/**
 * Schema builder for tiny-cms
 * Generates PostgreSQL tables from collection definitions
 */

import { sql, type Kysely } from 'kysely'
import type { Collection, Field } from '@tiny-cms/core'

/**
 * Build database schema from collections
 */
export class SchemaBuilder {
  constructor(private db: Kysely<never>) {}

  /**
   * Create tables for all collections
   */
  async buildSchema(collections: Collection[], tablePrefix = ''): Promise<void> {
    for (const collection of collections) {
      await this.createTableForCollection(collection, tablePrefix)
    }
  }

  /**
   * Create a table for a single collection
   */
  async createTableForCollection(collection: Collection, tablePrefix = ''): Promise<void> {
    const tableName = tablePrefix ? `${tablePrefix}${collection.name}` : collection.name

    // Check if table exists
    const tableExists = await this.tableExists(tableName)

    if (tableExists) {
      console.log(`Table "${tableName}" already exists, skipping creation`)
      return
    }

    console.log(`Creating table "${tableName}"...`)

    // Build create table query
    let query = this.db.schema
      .createTable(tableName)
      .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))

    // Add fields
    for (const field of collection.fields) {
      query = this.addFieldColumn(query, field)
    }

    // Add timestamps if enabled
    if (collection.timestamps !== false) {
      query = query
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    }

    // Add soft delete column if enabled
    if (collection.softDelete) {
      query = query.addColumn('deleted_at', 'timestamp')
    }

    await query.execute()

    console.log(`Table "${tableName}" created successfully`)
  }

  /**
   * Add a column for a field
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addFieldColumn(query: any, field: Field): any {
    const columnName = this.toSnakeCase(field.name)

    switch (field.type) {
      case 'text':
      case 'email':
      case 'richtext': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.addColumn(columnName, 'text', (col: any) => {
          if (field.required) {
            col = col.notNull()
          }
          if (field.unique) {
            col = col.unique()
          }
          if (field.defaultValue) {
            col = col.defaultTo(field.defaultValue)
          }
          return col
        })
        break
      }

      case 'number': {
        // Use numeric for better precision
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.addColumn(columnName, 'numeric', (col: any) => {
          if (field.required) {
            col = col.notNull()
          }
          if (field.unique) {
            col = col.unique()
          }
          if (field.defaultValue !== undefined) {
            col = col.defaultTo(field.defaultValue)
          }
          return col
        })
        break
      }

      case 'checkbox': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.addColumn(columnName, 'boolean', (col: any) => {
          if (field.required) {
            col = col.notNull()
          }
          if (field.defaultValue !== undefined) {
            col = col.defaultTo(field.defaultValue)
          } else {
            col = col.defaultTo(false)
          }
          return col
        })
        break
      }

      case 'date': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.addColumn(columnName, 'timestamp', (col: any) => {
          if (field.required) {
            col = col.notNull()
          }
          if (field.defaultValue) {
            col = col.defaultTo(field.defaultValue)
          }
          return col
        })
        break
      }

      case 'select': {
        // For select fields, store as text
        // For multiple selections, use JSONB
        if (field.multiple) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.addColumn(columnName, 'jsonb', (col: any) => {
            if (field.required) {
              col = col.notNull()
            }
            if (field.defaultValue) {
              col = col.defaultTo(sql`${JSON.stringify(field.defaultValue)}::jsonb`)
            } else {
              col = col.defaultTo(sql`'[]'::jsonb`)
            }
            return col
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.addColumn(columnName, 'text', (col: any) => {
            if (field.required) {
              col = col.notNull()
            }
            if (field.defaultValue) {
              col = col.defaultTo(field.defaultValue)
            }
            return col
          })
        }
        break
      }

      case 'relation': {
        // For relations, store as UUID or array of UUIDs (JSONB)
        if (field.multiple) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.addColumn(columnName, 'jsonb', (col: any) => {
            if (field.required) {
              col = col.notNull()
            }
            col = col.defaultTo(sql`'[]'::jsonb`)
            return col
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.addColumn(columnName, 'uuid', (col: any) => {
            if (field.required) {
              col = col.notNull()
            }
            // Add foreign key reference
            // Note: This assumes the related collection uses UUID as ID
            // col = col.references(`${field.to}.id`)
            return col
          })
        }
        break
      }
    }

    return query
  }

  /**
   * Drop tables for all collections
   */
  async dropSchema(collections: Collection[], tablePrefix = ''): Promise<void> {
    for (const collection of collections) {
      const tableName = tablePrefix ? `${tablePrefix}${collection.name}` : collection.name

      const exists = await this.tableExists(tableName)

      if (exists) {
        console.log(`Dropping table "${tableName}"...`)
        await this.db.schema.dropTable(tableName).execute()
        console.log(`Table "${tableName}" dropped successfully`)
      }
    }
  }

  /**
   * Check if a table exists
   */
  private async tableExists(tableName: string): Promise<boolean> {
    const result = await this.db
      .selectFrom(sql`information_schema.tables`.as('t'))
      .select(sql`1`.as('exists'))
      .where('table_schema' as never, '=' as never, 'public' as never)
      .where('table_name' as never, '=' as never, tableName as never)
      .executeTakeFirst()

    return !!result
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }
}
