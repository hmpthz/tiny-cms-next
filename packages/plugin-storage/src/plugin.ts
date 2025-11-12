/**
 * Storage plugin for tiny-cms
 * Provides signed URL generation for client-side uploads and file deletion
 */

import type { Config, Plugin } from '@tiny-cms/core'
import type { StorageAdapter } from './types'
import { registerRoutes } from './routes'

export interface StoragePluginOptions {
  /** Storage adapter to use */
  adapter: StorageAdapter
}

/**
 * Create storage plugin
 * This plugin adds storage capabilities to the CMS for client-side uploads
 * using signed URLs and file deletion
 *
 * Note: To enable SDK extensions on the client side, import and call
 * `extendSDK` with the TinyCmsSDK class from @tiny-cms/core
 */
export function storagePlugin(options: StoragePluginOptions) {
  const { adapter } = options

  // Create plugin function with route registration
  const plugin: Plugin = (config: Config) => {
    return config
  }

  // Add route registration
  plugin.registerRoutes = (app) => registerRoutes(app, adapter)

  return plugin
}
