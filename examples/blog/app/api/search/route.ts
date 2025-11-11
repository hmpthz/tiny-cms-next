/**
 * Search API endpoint
 * Searches across posts and categories using PostgreSQL full-text search
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchMultipleCollections } from '@tiny-cms/plugin-search'
import { cms } from '@/lib/cms'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const collections = searchParams.get('collections')?.split(',') || ['posts', 'categories']
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    // Get database instance from CMS
    const db = cms.config.db.db

    // Search across collections
    const results = await searchMultipleCollections(db, {
      query,
      collections,
      limit,
      language: 'english',
      minRank: 0.01, // Minimum relevance threshold
    })

    // Format results for response
    const formattedResults = results.map((result) => ({
      ...result.document,
      _collection: result.collection,
      _rank: result.rank,
    }))

    return NextResponse.json({
      query,
      results: formattedResults,
      total: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
