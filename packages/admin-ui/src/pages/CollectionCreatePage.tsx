'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import useSWR from 'swr'
import { AdminLayout } from '../components/AdminLayout'
import { useSdkClient } from '../sdk-context'
import type {
  AdminCollectionSummary,
  CollectionCreateInitialData,
  DashboardCollectionInfo,
  DashboardInitialData,
} from '../types'
import { DocumentForm } from '../components/DocumentForm'

export interface CollectionCreatePageProps {
  initialData: CollectionCreateInitialData
  collections: DashboardCollectionInfo[]
  currentUser: DashboardInitialData['user']
  serverActions: {
    createDocument: (args: { collection: string; data: Record<string, unknown> }) => Promise<void>
  }
}

interface CollectionCreateContextValue {
  isSubmitting: boolean
  create: (values: Record<string, unknown>) => Promise<void>
}

const CollectionCreateContext = createContext<CollectionCreateContextValue | null>(null)

function CollectionCreateProvider({
  initialData,
  serverActions,
  children,
}: {
  initialData: CollectionCreateInitialData
  serverActions: CollectionCreatePageProps['serverActions']
  children: ReactNode
}) {
  const sdk = useSdkClient()

  // Verify API is reachable; no data is needed here but we keep SWR to
  // follow the same pattern as other pages.
  const { isLoading } = useSWR(
    ['admin', 'create', initialData.collection.name],
    async () => {
      await sdk.count({ collection: initialData.collection.name })
      return null
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  )

  const value: CollectionCreateContextValue = {
    isSubmitting: isLoading,
    create: async (values: Record<string, unknown>) => {
      await serverActions.createDocument({
        collection: initialData.collection.name,
        data: values,
      })
      // After creating, navigate back to the list view.
      window.location.href = `/admin/${initialData.collection.name}`
    },
  }

  return (
    <CollectionCreateContext.Provider value={value}>{children}</CollectionCreateContext.Provider>
  )
}

function useCollectionCreateContext() {
  const ctx = useContext(CollectionCreateContext)
  if (!ctx) {
    throw new Error('useCollectionCreateContext must be used within CollectionCreateProvider')
  }
  return ctx
}

export function CollectionCreatePage({
  initialData,
  collections,
  currentUser,
  serverActions,
}: CollectionCreatePageProps) {
  return (
    <CollectionCreateProvider initialData={initialData} serverActions={serverActions}>
      <AdminLayout user={currentUser} collections={collections}>
        <CollectionCreateContent collection={initialData.collection} />
      </AdminLayout>
    </CollectionCreateProvider>
  )
}

function CollectionCreateContent({ collection }: { collection: AdminCollectionSummary }) {
  const { isSubmitting, create } = useCollectionCreateContext()

  return (
    <div className="space-y-6">
      {isSubmitting && (
        <p className="text-sm text-muted-foreground" data-testid="create-loading">
          Preparing collection schema...
        </p>
      )}
      <DocumentForm
        collection={collection}
        mode="create"
        onSubmit={async (values) => {
          await create(values)
        }}
      />
    </div>
  )
}
