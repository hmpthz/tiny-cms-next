export { SdkClientProvider, useSdkClient } from './sdk-context'

export type {
  AdminRouteParams,
  AdminView,
  AdminCollectionSummary,
  DashboardCollectionInfo,
  DashboardInitialData,
  CollectionListInitialData,
  CollectionEditInitialData,
  CollectionCreateInitialData,
  AccountInitialData,
  SignInInitialData,
} from './types'

export { AdminLayout } from './components/AdminLayout'

export { DocumentForm } from './components/DocumentForm'
export type { DocumentFormProps } from './components/DocumentForm'
export { MarkdownPreview } from './components/Markdown'

export { AdminDashboardPage } from './pages/AdminDashboardPage'
export type { AdminDashboardPageProps } from './pages/AdminDashboardPage'

export { CollectionListPage } from './pages/CollectionListPage'
export type { CollectionListPageProps } from './pages/CollectionListPage'

export { CollectionCreatePage } from './pages/CollectionCreatePage'
export type { CollectionCreatePageProps } from './pages/CollectionCreatePage'

export { CollectionEditPage } from './pages/CollectionEditPage'
export type { CollectionEditPageProps } from './pages/CollectionEditPage'

export { SignInPage } from './pages/SignInPage'
export type { SignInPageProps } from './pages/SignInPage'

export { AccountPage } from './pages/AccountPage'
export type { AccountPageProps } from './pages/AccountPage'
