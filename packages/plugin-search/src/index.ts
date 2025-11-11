/**
 * @tiny-cms/plugin-search
 * PostgreSQL full-text search for tiny-cms
 */

// Export types
export type {
  SearchableCollection,
  SearchConfig,
  SearchResult,
  SearchQueryOptions,
  Database,
} from './types'

// Export plugin
export { searchPlugin, type SearchPluginOptions } from './plugin'

// Export setup utilities
export {
  addSearchVectorColumn,
  createSearchIndex,
  createSearchTrigger,
  updateExistingSearchVectors,
  setupCollectionSearch,
  removeCollectionSearch,
} from './pg-fts/setup'

// Export query utilities
export {
  searchCollection,
  searchMultipleCollections,
  getSearchSuggestions,
  getSearchStats,
} from './pg-fts/query'
