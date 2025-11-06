'use client'

/**
 * Search page for the blog
 * Simple UI for searching posts and categories
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt?: string
  _collection: string
  _rank: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&collections=posts,categories&limit=20`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts and categories..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          <p className="text-gray-600">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>

          {results.map((result) => (
            <div
              key={`${result._collection}-${result.id}`}
              className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {result._collection}
                </span>
                <span className="text-xs text-gray-400">
                  Relevance: {Math.round(result._rank * 100)}%
                </span>
              </div>

              <h2 className="text-xl font-semibold mb-2">
                <Link
                  href={`/${result._collection}/${result.slug}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {result.title}
                </Link>
              </h2>

              {result.excerpt && (
                <p className="text-gray-600">{result.excerpt}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && !error && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No results found for &quot;{query}&quot;</p>
          <p className="text-sm mt-2">Try different keywords or check your spelling</p>
        </div>
      )}

      {!query && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>Enter a search term to get started</p>
        </div>
      )}
    </div>
  )
}
