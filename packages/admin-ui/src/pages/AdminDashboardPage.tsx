'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import useSWR from 'swr'
import { AdminLayout } from '../components/AdminLayout'
import { useAdminSdk } from '../sdk-context'
import type { DashboardCollectionInfo, DashboardInitialData } from '../types'

export interface AdminDashboardPageProps {
  initialData: DashboardInitialData
}

interface DashboardContextValue {
  data: DashboardInitialData
  isLoading: boolean
  error?: Error
  refresh: () => Promise<DashboardInitialData | undefined>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function DashboardProvider({
  initialData,
  children,
}: {
  initialData: DashboardInitialData
  children: ReactNode
}) {
  const sdk = useAdminSdk()

  const { data, isLoading, error, mutate } = useSWR(
    ['admin', 'dashboard'],
    async () => {
      const collectionsWithCounts: DashboardCollectionInfo[] = await Promise.all(
        initialData.collections.map(async (collection) => {
          try {
            const countResult = await sdk.count({ collection: collection.name })
            return { ...collection, totalDocs: countResult.totalDocs }
          } catch {
            return collection
          }
        }),
      )

      return {
        ...initialData,
        collections: collectionsWithCounts,
      }
    },
    {
      fallbackData: initialData,
    },
  )

  const value: DashboardContextValue = {
    data: data ?? initialData,
    isLoading,
    error: error as Error | undefined,
    refresh: () => mutate(),
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

function useDashboardContext() {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error('useDashboardContext must be used within DashboardProvider')
  }
  return ctx
}

export function AdminDashboardPage({ initialData }: AdminDashboardPageProps) {
  return (
    <DashboardProvider initialData={initialData}>
      <DashboardContent />
    </DashboardProvider>
  )
}

function DashboardContent() {
  const { data, isLoading } = useDashboardContext()
  const { user, collections } = data

  return (
    <AdminLayout user={user} collections={collections}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick overview of your collections. Use the sidebar to manage content.
          </p>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground" data-testid="dashboard-loading">
            Loading collection statistics...
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <div
              key={collection.name}
              className="rounded-lg border bg-background p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Collection
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {collection.labels?.plural || collection.name}
                </div>
                {typeof collection.totalDocs === 'number' && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {collection.totalDocs} document{collection.totalDocs === 1 ? '' : 's'}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <a
                  href={`/admin/${collection.name}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View documents
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
