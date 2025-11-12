/**
 * RootPage - Main page handler for admin routes
 * Parses the URL and renders the appropriate view
 * Server Component
 */

import type { TinyCMS } from '@tiny-cms/core'
import { initReq } from './initReq'
import { parseRoute } from './routing'
import { Dashboard } from './components/Dashboard'
import { ListView } from './components/ListView'
import { EditView } from './components/EditView'
import { CreateView } from './components/CreateView'

export interface RootPageProps {
  cms: TinyCMS
  segments: string[]
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function RootPage({ cms, segments, searchParams }: RootPageProps) {
  // Initialize request context
  const context = await initReq(cms)

  // Parse the route
  const route = parseRoute(segments)

  // Parse query params
  const limit = searchParams?.limit ? Number(searchParams.limit) : 10
  const offset = searchParams?.offset ? Number(searchParams.offset) : 0

  // Render the appropriate view
  switch (route.view) {
    case 'dashboard':
      return <Dashboard context={context} />

    case 'list':
      if (!route.collection) {
        return <Dashboard context={context} />
      }
      return (
        <ListView context={context} collection={route.collection} limit={limit} offset={offset} />
      )

    case 'create':
      if (!route.collection) {
        return <Dashboard context={context} />
      }
      return <CreateView context={context} collection={route.collection} />

    case 'edit':
      if (!route.collection || !route.id) {
        return <Dashboard context={context} />
      }
      return <EditView context={context} collection={route.collection} id={route.id} />

    default:
      return <Dashboard context={context} />
  }
}
