import type { Document, Field, FindResult } from '@tiny-cms/core'

export interface AdminCollectionSummary {
  name: string
  labels?: {
    singular?: string
    plural?: string
  }
  fields: Field[]
}

export interface DashboardCollectionInfo extends AdminCollectionSummary {
  totalDocs?: number
}

export interface DashboardInitialData {
  user: {
    id: string
    email?: string
    name?: string
    role?: string
    [key: string]: unknown
  }
  collections: DashboardCollectionInfo[]
}

export interface CollectionListInitialData<TDoc extends Document = Document> {
  collection: AdminCollectionSummary
  result: FindResult<TDoc>
}

export interface CollectionEditInitialData<TDoc extends Document = Document> {
  collection: AdminCollectionSummary
  doc: TDoc
}

export interface CollectionCreateInitialData {
  collection: AdminCollectionSummary
}

export interface AccountInitialData {
  user: DashboardInitialData['user']
}

export interface SignInInitialData {
  isAuthenticated: boolean
  redirectTo?: string
}

export type AdminView = 'dashboard' | 'list' | 'create' | 'edit' | 'signIn' | 'account'

export interface AdminRouteParams {
  view: AdminView
  collection?: string
  id?: string
}
