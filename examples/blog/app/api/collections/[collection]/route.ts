/**
 * Collection API routes
 * GET /api/collections/[collection] - List documents
 * POST /api/collections/[collection] - Create document
 */

import { createCollectionHandlers } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'
import type { RouteContext } from '@tiny-cms/next'

// Get collection name from route params
export async function GET(request: Request, context: RouteContext) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.GET(request as never)
}

export async function POST(request: Request, context: RouteContext) {
  const cms = await getCMS()
  const params = await context.params
  const handlers = createCollectionHandlers(cms, params.collection)
  return handlers.POST(request as never)
}
