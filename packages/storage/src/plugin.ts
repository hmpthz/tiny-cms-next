/**
 * Storage plugin for tiny-cms
 * Adds storage adapter to CMS config
 */

import type { Plugin } from '@tiny-cms/core'
import type { StorageAdapter } from './types'

export interface StoragePluginOptions {
  /** Storage adapter to use */
  adapter: StorageAdapter
}

/**
 * Create storage plugin
 * This plugin adds storage capabilities to the CMS by injecting a storage adapter
 */
export function storagePlugin(options: StoragePluginOptions): Plugin {
  return (config) => {
    // Add storage adapter to config
    return {
      ...config,
      storage: options.adapter as any, // Type cast to match core's StorageAdapter
    }
  }
}
