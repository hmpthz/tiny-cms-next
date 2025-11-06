/**
 * RootLayout - Admin layout with navigation
 * Server Component
 */

import type { ReactNode } from 'react'
import type { TinyCMS } from '@tiny-cms/core'
import { initReq } from './initReq'

export interface RootLayoutProps {
  cms: TinyCMS
  children: ReactNode
}

export async function RootLayout({ cms, children }: RootLayoutProps) {
  // Initialize request context
  const context = await initReq(cms)
  const { user } = context

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', padding: '20px', borderRight: '1px solid #ccc' }}>
        <h2>tiny-cms</h2>

        <div style={{ marginBottom: '20px' }}>
          <strong>{user.email || 'User'}</strong>
          <br />
          <small>{user.role || 'member'}</small>
        </div>

        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
              <a href="/admin">Dashboard</a>
            </li>

            <li style={{ marginTop: '20px', marginBottom: '10px' }}>
              <strong>Collections</strong>
            </li>

            {cms.getConfig().collections.map((collection: { name: string; labels?: { plural?: string } }) => (
              <li key={collection.name} style={{ marginBottom: '5px', paddingLeft: '10px' }}>
                <a href={`/admin/${collection.name}`}>
                  {collection.labels?.plural || collection.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <a href="/api/auth/signout">Sign Out</a>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '20px' }}>{children}</main>
    </div>
  )
}
