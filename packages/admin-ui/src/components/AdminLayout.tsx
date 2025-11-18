'use client'

import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import type { DashboardCollectionInfo, DashboardInitialData } from '../types'

export interface AdminLayoutProps {
  user?: DashboardInitialData['user']
  collections: DashboardCollectionInfo[]
  children: ReactNode
}

export function AdminLayout({ user, collections, children }: AdminLayoutProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true)
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })
      window.location.href = '/admin/sign-in'
    } catch {
      // Best-effort sign-out; ignore errors for now
    } finally {
      setIsSigningOut(false)
    }
  }, [])

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="px-4 py-4 border-b">
          <div className="text-lg font-semibold">tiny-cms admin</div>
          {user && (
            <div className="mt-2 text-sm text-muted-foreground">
              <div>{(user.name as string) || (user.email as string) || 'User'}</div>
              {user.role && (
                <div className="text-xs uppercase tracking-wide">{String(user.role)}</div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 text-sm">
          <a href="/admin" className="block rounded px-2 py-1 hover:bg-muted">
            Dashboard
          </a>

          <div className="mt-4 text-xs font-semibold text-muted-foreground uppercase">
            Collections
          </div>
          <ul className="mt-2 space-y-1">
            {collections.map((collection) => (
              <li key={collection.name}>
                <a
                  href={`/admin/${collection.name}`}
                  className="block rounded px-2 py-1 hover:bg-muted"
                >
                  {collection.labels?.plural || collection.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t text-sm">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

