/**
 * Search plugin for tiny-cms
 * Adds full-text search capabilities using PostgreSQL
 */

import type { Plugin, AfterChangeHook } from '@tiny-cms/core'

export interface SearchPluginOptions {
  /** Collections to enable search on with their searchable fields */
  collections: Array<{
    /** Collection name */
    name: string
    /** Fields to include in search index */
    searchFields: string[]
    /** Language for text search (default: 'english') */
    language?: string
  }>
}

/**
 * Create search plugin
 * This plugin adds search capabilities by wrapping afterChange hooks
 * The actual search index is maintained by PostgreSQL triggers (see pg-fts/setup.ts)
 */
export function searchPlugin(options: SearchPluginOptions): Plugin {
  return (config) => {
    // Transform collections to add search hooks
    const modifiedCollections = config.collections.map((collection) => {
      const searchConfig = options.collections.find((sc) => sc.name === collection.name)

      if (!searchConfig) {
        // Collection not enabled for search, return as-is
        return collection
      }

      // Wrap existing afterChange hook to add search logging
      const originalAfterChange = collection.hooks?.afterChange
      const newAfterChange: AfterChangeHook = async (args) => {
        // Call original hook if it exists
        if (originalAfterChange) {
          await originalAfterChange(args)
        }

        // Search index update is handled by PostgreSQL triggers
        // This is just for logging/monitoring
        console.log(`[Search] Document updated in ${args.context.collection}:`, args.doc.id)
      }

      // Add search sync hooks to this collection
      return {
        ...collection,
        hooks: {
          ...collection.hooks,
          afterChange: newAfterChange,
        },
      }
    })

    return {
      ...config,
      collections: modifiedCollections,
    }
  }
}
