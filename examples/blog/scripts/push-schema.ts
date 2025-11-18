/**
 * Database schema setup script
 * Creates all tables for the blog example using the database adapter
 */

import 'dotenv/config'
import { getCMS } from '../lib/cms'

async function main() {
  console.log('🔄 Setting up database schema...\n')

  try {
    // Get the CMS instance
    const cms = getCMS()

    // Initialize the database connection
    await cms.init()

    // Get the database adapter and config
    const db = cms.getDb()
    const config = cms.getConfig()

    // Use the adapter's schema operations to create tables
    if (db.schema.setupCollectionTables) {
      await db.schema.setupCollectionTables(config.collections)
    } else {
      // Fallback: create tables manually
      for (const collection of config.collections) {
        const tableName = collection.slug || collection.name

        // Check if table exists
        const exists = await db.schema.tableExists(tableName)
        if (exists) {
          console.log(`  ⏭️  Table '${tableName}' already exists, skipping...`)
          continue
        }

        // Create basic columns
        const columns = [
          {
            name: 'id',
            type: 'uuid' as const,
            primaryKey: true,
            defaultValue: 'gen_random_uuid()',
          },
          { name: 'createdAt', type: 'timestamp' as const, notNull: true, defaultValue: 'now' },
          { name: 'updatedAt', type: 'timestamp' as const, notNull: true, defaultValue: 'now' },
        ]

        // Add fields from collection definition
        for (const field of collection.fields) {
          const column: any = {
            name: field.name,
            type: mapFieldTypeToColumnType(field.type),
            notNull: field.required || false,
          }

          if (field.unique) {
            column.unique = true
          }

          columns.push(column)
        }

        // Create the table
        await db.schema.createTable(tableName, columns)
        console.log(`  ✅ Created table: ${tableName}`)
      }
    }

    console.log('\n✅ Database schema created successfully!')
    console.log('\nCreated tables:')
    config.collections.forEach((collection) => {
      console.log(`  - ${collection.name}`)
    })

    console.log('\nBetter-auth will create its tables automatically on first use:')
    console.log('  - user')
    console.log('  - session')
    console.log('  - verification')
    console.log('  - account')

    // Shutdown the CMS to close database connections
    await cms.shutdown()
  } catch (error) {
    console.error('\n❌ Error creating schema:', error)
    process.exit(1)
  }
}

/**
 * Map field types to database column types
 */
function mapFieldTypeToColumnType(
  fieldType: string,
): 'text' | 'integer' | 'boolean' | 'json' | 'timestamp' | 'uuid' | 'decimal' {
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

main()
