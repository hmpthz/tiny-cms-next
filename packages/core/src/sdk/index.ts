/**
 * @tiny-cms/sdk - Type-safe client SDK for tiny-cms
 */

// Main SDK class
export { TinyCmsSDK } from './sdk'

// Types
export type {
  SDKConfig,
  FindOptions,
  FindByIdOptions,
  CreateOptions,
  UpdateOptions,
  DeleteOptions,
  CountOptions,
  CountResult,
  LoginOptions,
  MeOptions,
  RefreshTokenOptions,
  CollectionDocumentMap,
  GetCollectionDocument,
} from './types'

// Error class
export { SDKError } from './types'
