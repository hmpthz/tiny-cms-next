/**
 * PostgreSQL Full-Text Search query utilities
 * Provides functions to search across collections with ranking
 */

import { sql } from 'kysely'
import type { Database, SearchQueryOptions, SearchResult } from '../types'

/**
 * Sanitize search query for PostgreSQL tsquery
 * Removes special characters and formats for search
 */
function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .split(/\s+/) // Split into words
    .filter((word) => word.length > 0) // Remove empty
    .map((word) => `${word}:*`) // Add prefix matching
    .join(' & ') // Join with AND operator
}

/**
 * Search a single collection using PostgreSQL full-text search
 */
export async function searchCollection<T = any>(
  db: Database,
  collectionName: string,
  queryText: string,
  options: {
    language?: string
    limit?: number
    minRank?: number
  } = {}
): Promise<SearchResult<T>[]> {
  const { language = 'english', limit = 10, minRank = 0 } = options

  const sanitizedQuery = sanitizeSearchQuery(queryText)

  if (!sanitizedQuery) {
    return []
  }

  const columnName = '_search_vector'

  // Execute search query with ranking
  const results = await db
    .selectFrom(collectionName)
    .selectAll()
    .select(
      sql<number>`ts_rank(${sql.ref(columnName)}, to_tsquery(${language}::regconfig, ${sanitizedQuery}))`.as(
        'rank'
      )
    )
    .where(
      sql<boolean>`${sql.ref(columnName)} @@ to_tsquery(${language}::regconfig, ${sanitizedQuery})`
    )
    .orderBy('rank', 'desc')
    .limit(limit)
    .execute()

  // Filter by minimum rank if specified
  return results
    .filter((row: any) => row.rank >= minRank)
    .map((row: any) => {
      const { rank, ...document } = row
      return {
        document: document as T,
        collection: collectionName,
        rank,
      }
    })
}

/**
 * Search across multiple collections
 */
export async function searchMultipleCollections(
  db: Database,
  options: SearchQueryOptions
): Promise<SearchResult[]> {
  const {
    query,
    collections = [],
    language = 'english',
    limit = 10,
    minRank = 0,
  } = options

  if (!query || collections.length === 0) {
    return []
  }

  // Search each collection and combine results
  const searchPromises = collections.map((collectionName) =>
    searchCollection(db, collectionName, query, {
      language,
      limit,
      minRank,
    }).catch((error) => {
      console.error(`Error searching collection ${collectionName}:`, error)
      return []
    })
  )

  const results = await Promise.all(searchPromises)

  // Flatten and sort all results by rank
  return results
    .flat()
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
}

/**
 * Get search suggestions based on partial query
 * Uses PostgreSQL prefix matching for autocomplete
 */
export async function getSearchSuggestions(
  db: Database,
  collectionName: string,
  partialQuery: string,
  options: {
    field?: string
    language?: string
    limit?: number
  } = {}
): Promise<string[]> {
  const { field = 'title', language = 'english', limit = 5 } = options

  if (!partialQuery || partialQuery.length < 2) {
    return []
  }

  const sanitizedQuery = sanitizeSearchQuery(partialQuery)
  const columnName = '_search_vector'

  try {
    const results = await db
      .selectFrom(collectionName)
      .select([field])
      .select(
        sql<number>`ts_rank(${sql.ref(columnName)}, to_tsquery(${language}::regconfig, ${sanitizedQuery}))`.as(
          'rank'
        )
      )
      .where(
        sql<boolean>`${sql.ref(columnName)} @@ to_tsquery(${language}::regconfig, ${sanitizedQuery})`
      )
      .orderBy('rank', 'desc')
      .limit(limit)
      .execute()

    return results.map((row: any) => row[field]).filter(Boolean)
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return []
  }
}

/**
 * Get search statistics for a query
 */
export async function getSearchStats(
  db: Database,
  collectionName: string,
  queryText: string,
  language = 'english'
): Promise<{
  totalMatches: number
  avgRank: number
}> {
  const sanitizedQuery = sanitizeSearchQuery(queryText)

  if (!sanitizedQuery) {
    return { totalMatches: 0, avgRank: 0 }
  }

  const columnName = '_search_vector'

  try {
    const result = await db
      .selectFrom(collectionName)
      .select([
        sql<number>`COUNT(*)`.as('count'),
        sql<number>`AVG(ts_rank(${sql.ref(columnName)}, to_tsquery(${language}::regconfig, ${sanitizedQuery})))`.as(
          'avg_rank'
        ),
      ])
      .where(
        sql<boolean>`${sql.ref(columnName)} @@ to_tsquery(${language}::regconfig, ${sanitizedQuery})`
      )
      .executeTakeFirst()

    return {
      totalMatches: Number(result?.count || 0),
      avgRank: Number(result?.avg_rank || 0),
    }
  } catch (error) {
    console.error('Error getting search stats:', error)
    return { totalMatches: 0, avgRank: 0 }
  }
}
