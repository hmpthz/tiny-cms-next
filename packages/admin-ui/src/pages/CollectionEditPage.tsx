'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import useSWR from 'swr'
import type { Document } from '@tiny-cms/core'
import { AdminLayout } from '../components/AdminLayout'
import { useSdkClient } from '../sdk-context'
import { DocumentForm } from '../components/DocumentForm'
import type {
  AdminCollectionSummary,
  CollectionEditInitialData,
  DashboardCollectionInfo,
  DashboardInitialData,
} from '../types'

export interface CollectionEditPageProps {
  initialData: CollectionEditInitialData
  collections: DashboardCollectionInfo[]
  currentUser: DashboardInitialData['user']
  serverActions: {
    updateDocument: (args: {
      collection: string
      id: string
      data: Record<string, unknown>
    }) => Promise<void>
    deleteDocument: (args: { collection: string; id: string }) => Promise<void>
  }
}

interface CollectionEditContextValue {
  doc: Document
  isLoading: boolean
  save: (values: Record<string, unknown>) => Promise<void>
  remove: () => Promise<void>
}

const CollectionEditContext = createContext<CollectionEditContextValue | null>(null)

function CollectionEditProvider({
  initialData,
  serverActions,
  children,
}: {
  initialData: CollectionEditInitialData
  serverActions: CollectionEditPageProps['serverActions']
  children: ReactNode
}) {
  const sdk = useSdkClient()
  const { collection, doc } = initialData

  const { data, isLoading, mutate } = useSWR<Document>(
    ['admin', 'edit', collection.name, String(doc.id)],
    () =>
      sdk.findById({
        collection: collection.name,
        id: String(doc.id),
      }),
    {
      fallbackData: doc,
    },
  )

  const value: CollectionEditContextValue = {
    doc: data ?? doc,
    isLoading,
    save: async (values: Record<string, unknown>) => {
      await serverActions.updateDocument({
        collection: collection.name,
        id: String(doc.id),
        data: values,
      })
      await mutate()
    },
    remove: async () => {
      await serverActions.deleteDocument({
        collection: collection.name,
        id: String(doc.id),
      })
      window.location.href = `/admin/${collection.name}`
    },
  }

  return <CollectionEditContext.Provider value={value}>{children}</CollectionEditContext.Provider>
}

function useCollectionEditContext() {
  const ctx = useContext(CollectionEditContext)
  if (!ctx) {
    throw new Error('useCollectionEditContext must be used within CollectionEditProvider')
  }
  return ctx
}

export function CollectionEditPage({
  initialData,
  collections,
  currentUser,
  serverActions,
}: CollectionEditPageProps) {
  return (
    <CollectionEditProvider initialData={initialData} serverActions={serverActions}>
      <AdminLayout user={currentUser} collections={collections}>
        <CollectionEditContent collection={initialData.collection} />
      </AdminLayout>
    </CollectionEditProvider>
  )
}

function CollectionEditContent({ collection }: { collection: AdminCollectionSummary }) {
  const { doc, isLoading, save, remove } = useCollectionEditContext()

  return (
    <div className="space-y-6">
      {isLoading && (
        <p className="text-sm text-muted-foreground" data-testid="edit-loading">
          Loading document...
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground font-mono">
          ID: <span>{String(doc.id)}</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-destructive/60 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/15"
          onClick={async () => {
            const confirmed = window.confirm('Are you sure you want to delete this document?')
            if (!confirmed) return
            await remove()
          }}
        >
          Delete document
        </button>
      </div>

      <DocumentForm
        collection={collection}
        initialValues={doc}
        mode="edit"
        onSubmit={async (values) => {
          await save(values)
        }}
      />
    </div>
  )
}
