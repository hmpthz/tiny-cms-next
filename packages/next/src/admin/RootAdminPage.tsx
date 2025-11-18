/**
 * RootAdminPage - Server component that prepares admin initial data and server actions.
 * UI and client-side data fetching live in @tiny-cms/admin-ui.
 */

import type { ReactNode } from 'react'
import type { TinyCMS } from '@tiny-cms/core'
import type { Collection, Document, AccessContext } from '@tiny-cms/core'
import {
  AdminDashboardPage,
  CollectionCreatePage,
  CollectionEditPage,
  CollectionListPage,
  AccountPage,
  SignInPage,
} from '@tiny-cms/admin-ui'
import type {
  DashboardInitialData,
  CollectionCreateInitialData,
  CollectionEditInitialData,
  CollectionListInitialData,
  AccountInitialData,
  SignInInitialData,
  DashboardCollectionInfo,
} from '@tiny-cms/admin-ui'
import { getServerAuth, requireServerAuth, withServerAuth } from '../handlers/auth'
import { parseRoute } from './routing'

export interface RootAdminPageProps {
  cms: TinyCMS
  segments: string[]
  searchParams?: { [key: string]: string | string[] | undefined }
  /**
   * Root provider wrapping the admin UI.
   * In the app project, this should be a component that renders
   * <AdminSdkProvider sdk={sdk}>{children}</AdminSdkProvider>.
   */
  RootProvider: (props: { children: ReactNode }) => ReactNode
}

function buildCollectionSummary(collection: Collection): DashboardCollectionInfo {
  return {
    name: collection.name,
    labels: collection.labels,
    fields: collection.fields,
  }
}

export async function RootAdminPage({
  cms,
  segments,
  searchParams,
  RootProvider,
}: RootAdminPageProps) {
  const route = parseRoute(segments)
  const config = cms.getConfig()
  const collectionConfigs = config.collections
  const collectionSummaries = collectionConfigs.map(buildCollectionSummary)

  // Sign-in view: does not require auth, but checks session.
  if (route.view === 'signIn') {
    const auth = await getServerAuth(cms)
    const initialData: SignInInitialData = {
      isAuthenticated: !!auth,
      redirectTo: typeof searchParams?.redirect === 'string' ? searchParams?.redirect : undefined,
    }

    return (
      <RootProvider>
        <SignInPage initialData={initialData} />
      </RootProvider>
    )
  }

  // All other views require auth.
  const context = await requireServerAuth(cms)
  const user = context.user as DashboardInitialData['user']
  const accessUser = context.user as AccessContext['user']

  // Dashboard
  if (route.view === 'dashboard') {
    const initialData: DashboardInitialData = {
      user,
      collections: collectionSummaries,
    }

    return (
      <RootProvider>
        <AdminDashboardPage initialData={initialData} />
      </RootProvider>
    )
  }

  // Account settings
  if (route.view === 'account') {
    const initialData: AccountInitialData = { user }

    return (
      <RootProvider>
      <AccountPage
          initialData={initialData}
          collections={collectionSummaries}
          currentUser={user}
          serverActions={{
            updateAccount: withServerAuth(
              cms,
              async ({ cms: serverCms, user: authUser }, values: Record<string, unknown>) => {
                // By convention, the "users" collection represents user accounts.
                const usersCollection = collectionConfigs.find((c) => c.name === 'users')
                if (!usersCollection) return
                if (!authUser?.id) return

                await serverCms.update('users', String(authUser.id), values, authUser as AccessContext['user'])
              },
            ),
          }}
        />
      </RootProvider>
    )
  }

  // From here on, a collection slug is required.
  if (!route.collection) {
    const fallbackData: DashboardInitialData = {
      user,
      collections: collectionSummaries,
    }

    return (
      <RootProvider>
        <AdminDashboardPage initialData={fallbackData} />
      </RootProvider>
    )
  }

  const targetCollection = collectionConfigs.find((c) => c.name === route.collection)
  if (!targetCollection) {
    const fallbackData: DashboardInitialData = {
      user,
      collections: collectionSummaries,
    }

    return (
      <RootProvider>
        <AdminDashboardPage initialData={fallbackData} />
      </RootProvider>
    )
  }

  const collectionSummary = buildCollectionSummary(targetCollection)

  // List view
  if (route.view === 'list') {
    const limit = searchParams?.limit ? Number(searchParams.limit) || 10 : 10
    const offset = searchParams?.offset ? Number(searchParams.offset) || 0 : 0

    const result = (await cms.find(route.collection, { limit, offset }, accessUser)) as unknown as {
      docs: Document[]
      totalDocs: number
      limit: number
      offset: number
      totalPages: number
      page: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }

    const initialData: CollectionListInitialData = {
      collection: collectionSummary,
      result,
    }

    return (
      <RootProvider>
        <CollectionListPage
          initialData={initialData}
          collections={collectionSummaries}
          currentUser={user}
          serverActions={{
            deleteDocument: withServerAuth(
              cms,
              async ({ cms: serverCms, user: authUser }, args: { collection: string; id: string }) => {
                await serverCms.delete(args.collection, args.id, authUser as AccessContext['user'])
              },
            ),
          }}
        />
      </RootProvider>
    )
  }

  // Create view
  if (route.view === 'create') {
    const initialData: CollectionCreateInitialData = {
      collection: collectionSummary,
    }

    return (
      <RootProvider>
        <CollectionCreatePage
          initialData={initialData}
          collections={collectionSummaries}
          currentUser={user}
          serverActions={{
            createDocument: withServerAuth(
              cms,
              async ({ cms: serverCms, user: authUser }, args: { collection: string; data: Record<string, unknown> }) => {
                await serverCms.create(args.collection, args.data, authUser as AccessContext['user'])
              },
            ),
          }}
        />
      </RootProvider>
    )
  }

  // Edit view
  if (route.view === 'edit' && route.id) {
    const doc = await cms.findById(route.collection, route.id, accessUser)

    if (!doc) {
      const fallback: DashboardInitialData = {
        user,
        collections: collectionSummaries,
      }

      return (
        <RootProvider>
          <AdminDashboardPage initialData={fallback} />
        </RootProvider>
      )
    }

    const initialData: CollectionEditInitialData = {
      collection: collectionSummary,
      doc: doc as Document,
    }

    return (
      <RootProvider>
        <CollectionEditPage
          initialData={initialData}
          collections={collectionSummaries}
          currentUser={user}
          serverActions={{
            updateDocument: withServerAuth(
              cms,
              async (
                { cms: serverCms, user: authUser },
                args: { collection: string; id: string; data: Record<string, unknown> },
              ) => {
                await serverCms.update(
                  args.collection,
                  args.id,
                  args.data,
                  authUser as AccessContext['user'],
                )
              },
            ),
            deleteDocument: withServerAuth(
              cms,
              async ({ cms: serverCms, user: authUser }, args: { collection: string; id: string }) => {
                await serverCms.delete(args.collection, args.id, authUser as AccessContext['user'])
              },
            ),
          }}
        />
      </RootProvider>
    )
  }

  // Fallback to dashboard on unknown route
  const fallbackData: DashboardInitialData = {
    user,
    collections: collectionSummaries,
  }

  return (
    <RootProvider>
      <AdminDashboardPage initialData={fallbackData} />
    </RootProvider>
  )
}
