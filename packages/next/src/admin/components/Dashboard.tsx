/**
 * Dashboard view - Admin home page
 * Server Component
 */

import type { RequestContext } from '../initReq'

export interface DashboardProps {
  context: RequestContext
}

export async function Dashboard({ context }: DashboardProps) {
  const { user, cms } = context
  const collections = cms.getConfig().collections

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email || 'User'}</p>

      <div>
        <h2>Collections</h2>
        <ul>
          {collections.map((collection: { name: string; labels?: { plural?: string } }) => (
            <li key={collection.name}>
              <a href={`/admin/${collection.name}`}>
                {collection.labels?.plural || collection.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
