/**
 * Database migration script to setup full-text search
 * Run this after creating your collections to enable search functionality
 */

import { setupCollectionSearch } from '@tiny-cms/plugin-search'
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'

async function main() {
  console.log('Setting up full-text search...')

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })

  // Create Kysely instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new Kysely<any>({
    dialect: new PostgresDialect({
      pool,
    }),
  })

  try {
    // Setup search for posts collection
    await setupCollectionSearch(db, {
      name: 'posts',
      searchFields: ['title', 'excerpt', 'content'],
      language: 'english',
      weight: 2, // Higher weight for posts
    })

    // Setup search for categories collection
    await setupCollectionSearch(db, {
      name: 'categories',
      searchFields: ['name', 'description'],
      language: 'english',
      weight: 1,
    })

    console.log('✅ Full-text search setup complete!')
    console.log('\nYou can now:')
    console.log('  - Search posts and categories using the /api/search endpoint')
    console.log('  - Visit /search page to try it out')
  } catch (error) {
    console.error('❌ Error setting up search:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
