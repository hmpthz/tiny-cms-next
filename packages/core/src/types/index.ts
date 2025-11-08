/**
 * Central exports for all tiny-cms core types
 */

// Field types
export type {
  BaseField,
  TextField,
  NumberField,
  EmailField,
  SelectField,
  CheckboxField,
  DateField,
  RelationField,
  RichTextField,
  Field,
  FieldValue,
} from './field'

// Collection types
export type {
  Collection,
  Document,
  WhereOperator,
  Where,
  SortOrder,
  OrderBy,
  FindOptions,
  FindResult,
} from './collection'

// Access control types
export type { AccessContext, AccessResult, AccessFunction, AccessControl } from './access'

// Hook types
export type {
  HookContext,
  BeforeChangeHook,
  AfterChangeHook,
  BeforeReadHook,
  CollectionHooks,
} from './hooks'

// Config types
export type { DatabaseAdapter, StorageAdapter, Config, Plugin } from './config'

export { defineConfig, buildConfig } from './config'
