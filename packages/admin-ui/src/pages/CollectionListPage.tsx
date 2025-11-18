'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import useSWR from 'swr'
import type { FindResult } from '@tiny-cms/core'
import { AdminLayout } from '../components/AdminLayout'
import { useAdminSdk } from '../sdk-context'
import type {
  CollectionListInitialData,
  DashboardCollectionInfo,
  DashboardInitialData,
} from '../types'

export interface CollectionListPageProps {
  initialData: CollectionListInitialData
  collections: DashboardCollectionInfo[]
  currentUser: DashboardInitialData['user']
  serverActions: {
    deleteDocument: (args: { collection: string; id: string }) => Promise<void>
  }
}

interface CollectionListContextValue {
  result: FindResult
  isLoading: boolean
  deleteDocument: (id: string) => Promise<void>
}

const CollectionListContext = createContext<CollectionListContextValue | null>(null)

function CollectionListProvider({
  initialData,
  serverActions,
  children,
}: {
  initialData: CollectionListInitialData
  serverActions: CollectionListPageProps['serverActions']
  children: ReactNode
}) {
  const sdk = useAdminSdk()
  const { collection, result } = initialData

  const { data, isLoading, mutate } = useSWR<FindResult>(
    ['admin', 'list', collection.name, result.limit, result.offset],
    () =>
      sdk.find({
        collection: collection.name,
        limit: result.limit,
        offset: result.offset,
      }),
    {
      fallbackData: result,
    },
  )

  const value: CollectionListContextValue = {
    result: data ?? result,
    isLoading,
    deleteDocument: async (id: string) => {
      await serverActions.deleteDocument({ collection: collection.name, id })
      await mutate()
    },
  }

  return <CollectionListContext.Provider value={value}>{children}</CollectionListContext.Provider>
}

function useCollectionListContext() {
  const ctx = useContext(CollectionListContext)
  if (!ctx) {
    throw new Error('useCollectionListContext must be used within CollectionListProvider')
  }
  return ctx
}

export function CollectionListPage({
  initialData,
  collections,
  currentUser,
  serverActions,
}: CollectionListPageProps) {
  return (
    <CollectionListProvider initialData={initialData} serverActions={serverActions}>
      <AdminLayout user={currentUser} collections={collections}>
        <CollectionListContent collectionName={initialData.collection.name} />
      </AdminLayout>
    </CollectionListProvider>
  )
}

function CollectionListContent({ collectionName }: { collectionName: string }) {
  const { result, isLoading, deleteDocument } = useCollectionListContext()
  const docs = result.docs

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Basic list view with pagination. Use the actions to edit or delete documents.
          </p>
        </div>
        <a
          href={`/admin/${collectionName}/create`}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Create new
        </a>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground" data-testid="list-loading">
          Loading documents...
        </p>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents found for this collection.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full bg-background text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc: Record<string, unknown>) => (
                <tr key={String(doc.id)} className="border-b last:border-none">
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {String(doc.id).slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {doc.createdAt
                      ? new Date(doc.createdAt as string).toLocaleString()
                      : 'Unknown'}
                  </td>
                  <td className="px-3 py-2 align-top space-x-2">
                    <a
                      href={`/admin/${collectionName}/${String(doc.id)}`}
                      className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Edit
                    </a>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-destructive/60 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/15"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          'Are you sure you want to delete this document?',
                        )
                        if (!confirmed) return
                        await deleteDocument(String(doc.id))
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Showing {result.offset + 1}–
          {Math.min(result.offset + result.limit, result.totalDocs)} of {result.totalDocs}{' '}
          documents
        </div>
        <div className="space-x-2">
          {result.hasPrevPage && (
            <a
              href={`?offset=${Math.max(result.offset - result.limit, 0)}&limit=${result.limit}`}
              className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              Previous
            </a>
          )}
          {result.hasNextPage && (
            <a
              href={`?offset=${result.offset + result.limit}&limit=${result.limit}`}
              className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

