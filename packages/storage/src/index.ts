/**
 * @tiny-cms/storage
 * Storage adapter system for tiny-cms with Supabase support
 */

// Export types
export type {
  UploadedFile,
  UploadArgs,
  DeleteArgs,
  GenerateURLArgs,
  SignedURLArgs,
  SignedURLResult,
  StorageAdapter,
  StorageConfig,
} from './types'

// Export Supabase adapter
export { createSupabaseAdapter } from './adapters/supabase'
export type { SupabaseAdapterConfig } from './adapters/supabase'

// Export plugin
export { storagePlugin, type StoragePluginOptions } from './plugin'
