/**
 * PostgreSQL Full-Text Search setup utilities
 * Creates search vectors, indexes, and triggers for collections
 */

import { sql } from 'kysely'
import type { Database, SearchableCollection } from '../types'

/**
 * Add search vector column to a table
 */
export async function addSearchVectorColumn(
  db: Database,
  tableName: string,
  columnName = '_search_vector'
): Promise<void> {
  // Add tsvector column for search
  await sql`
    ALTER TABLE ${sql.table(tableName)}
    ADD COLUMN IF NOT EXISTS ${sql.ref(columnName)} tsvector
  `.execute(db)
}

/**
 * Create GIN index on search vector column for fast searching
 */
export async function createSearchIndex(
  db: Database,
  tableName: string,
  columnName = '_search_vector'
): Promise<void> {
  const indexName = `${tableName}_${columnName}_idx`

  await sql`
    CREATE INDEX IF NOT EXISTS ${sql.raw(indexName)}
    ON ${sql.table(tableName)}
    USING GIN (${sql.ref(columnName)})
  `.execute(db)
}

/**
 * Create trigger to automatically update search vector on insert/update
 */
export async function createSearchTrigger(
  db: Database,
  collection: SearchableCollection
): Promise<void> {
  const { name: tableName, searchFields, language = 'english' } = collection
  const columnName = '_search_vector'
  const triggerName = `${tableName}_search_trigger`
  const functionName = `${tableName}_search_update`

  // Create trigger function that updates search vector
  await sql`
    CREATE OR REPLACE FUNCTION ${sql.raw(functionName)}()
    RETURNS trigger AS $$
    BEGIN
      NEW.${sql.ref(columnName)} := to_tsvector(
        ${language}::regconfig,
        ${sql.raw(
          searchFields
            .map((field) => `coalesce(NEW.${field}, '')`)
            .join(" || ' ' || ")
        )}
      );
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `.execute(db)

  // Create trigger that calls the function
  await sql`
    DROP TRIGGER IF EXISTS ${sql.raw(triggerName)} ON ${sql.table(tableName)};

    CREATE TRIGGER ${sql.raw(triggerName)}
    BEFORE INSERT OR UPDATE ON ${sql.table(tableName)}
    FOR EACH ROW
    EXECUTE FUNCTION ${sql.raw(functionName)}();
  `.execute(db)
}

/**
 * Update existing rows with search vector values
 */
export async function updateExistingSearchVectors(
  db: Database,
  collection: SearchableCollection
): Promise<void> {
  const { name: tableName, searchFields, language = 'english' } = collection
  const columnName = '_search_vector'

  // Build the concatenation expression for search fields
  const searchExpression = searchFields
    .map((field) => `coalesce(${field}, '')`)
    .join(" || ' ' || ")

  await sql`
    UPDATE ${sql.table(tableName)}
    SET ${sql.ref(columnName)} = to_tsvector(
      ${language}::regconfig,
      ${sql.raw(searchExpression)}
    )
  `.execute(db)
}

/**
 * Setup full-text search for a collection
 * This creates the column, index, trigger, and updates existing rows
 */
export async function setupCollectionSearch(
  db: Database,
  collection: SearchableCollection
): Promise<void> {
  const { name: tableName } = collection

  console.log(`Setting up full-text search for collection: ${tableName}`)

  // Add search vector column
  await addSearchVectorColumn(db, tableName)

  // Create GIN index
  await createSearchIndex(db, tableName)

  // Create auto-update trigger
  await createSearchTrigger(db, collection)

  // Update existing rows
  await updateExistingSearchVectors(db, collection)

  console.log(`Full-text search setup complete for: ${tableName}`)
}

/**
 * Remove search functionality from a collection
 */
export async function removeCollectionSearch(
  db: Database,
  tableName: string
): Promise<void> {
  const columnName = '_search_vector'
  const triggerName = `${tableName}_search_trigger`
  const functionName = `${tableName}_search_update`
  const indexName = `${tableName}_${columnName}_idx`

  // Drop trigger
  await sql`DROP TRIGGER IF EXISTS ${sql.raw(triggerName)} ON ${sql.table(tableName)}`.execute(db)

  // Drop function
  await sql`DROP FUNCTION IF EXISTS ${sql.raw(functionName)}()`.execute(db)

  // Drop index
  await sql`DROP INDEX IF EXISTS ${sql.raw(indexName)}`.execute(db)

  // Drop column
  await sql`
    ALTER TABLE ${sql.table(tableName)}
    DROP COLUMN IF EXISTS ${sql.ref(columnName)}
  `.execute(db)
}
