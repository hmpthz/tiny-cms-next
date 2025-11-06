/**
 * Database schema setup script
 * Creates all tables for the blog example
 */

import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { SchemaBuilder } from '@tiny-cms/db'
import { cmsConfig } from '../lib/cms'

async function main() {
  console.log('🔄 Setting up database schema...\n')

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })

  const db = new Kysely({
    dialect: new PostgresDialect({ pool }),
  })

  // Create schema builder
  const builder = new SchemaBuilder(db)

  try {
    // Create all collection tables
    await builder.buildSchema(cmsConfig.collections)

    console.log('\n✅ Database schema created successfully!')
    console.log('\nCreated tables:')
    cmsConfig.collections.forEach((collection) => {
      console.log(`  - ${collection.name}`)
    })

    console.log('\nBetter-auth will create its tables automatically on first use:')
    console.log('  - user')
    console.log('  - session')
    console.log('  - verification')
    console.log('  - account')
  } catch (error) {
    console.error('\n❌ Error creating schema:', error)
    process.exit(1)
  } finally {
    await db.destroy()
    await pool.end()
  }
}

main()
