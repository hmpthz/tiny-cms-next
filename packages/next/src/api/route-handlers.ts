/**
 * API route handlers for Next.js App Router
 * Provides easy-to-use handlers for CMS operations
 */

import { NextRequest, NextResponse } from 'next/server'
import type { TinyCMS } from '@tiny-cms/core'

export interface RouteContext {
  params: Promise<Record<string, string>>
}

/**
 * Create CRUD route handlers for a collection
 */
export function createCollectionHandlers(cms: TinyCMS, collectionName: string) {
  /**
   * GET /api/collections/[collection] - List documents
   */
  async function GET(request: NextRequest) {
    try {
      // Get session from request headers
      const user = await getUser(cms, request)

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams
      const limit = parseInt(searchParams.get('limit') || '10', 10)
      const offset = parseInt(searchParams.get('offset') || '0', 10)
      const where = searchParams.get('where') ? JSON.parse(searchParams.get('where')!) : undefined

      // Find documents
      const result = await cms.find(
        collectionName,
        {
          where,
          limit,
          offset,
        },
        user,
      )

      return NextResponse.json(result)
    } catch (error) {
      return handleError(error)
    }
  }

  /**
   * POST /api/collections/[collection] - Create document
   */
  async function POST(request: NextRequest) {
    try {
      const user = await getUser(cms, request)
      const data = await request.json()

      const doc = await cms.create(collectionName, data, user)

      return NextResponse.json(doc, { status: 201 })
    } catch (error) {
      return handleError(error)
    }
  }

  return { GET, POST }
}

/**
 * Create document-specific route handlers
 */
export function createDocumentHandlers(cms: TinyCMS, collectionName: string) {
  /**
   * GET /api/collections/[collection]/[id] - Get document by ID
   */
  async function GET(request: NextRequest, context: RouteContext) {
    try {
      const user = await getUser(cms, request)
      const params = await context.params
      const id = params.id

      const doc = await cms.findById(collectionName, id, user)

      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      return NextResponse.json(doc)
    } catch (error) {
      return handleError(error)
    }
  }

  /**
   * PATCH /api/collections/[collection]/[id] - Update document
   */
  async function PATCH(request: NextRequest, context: RouteContext) {
    try {
      const user = await getUser(cms, request)
      const params = await context.params
      const id = params.id
      const data = await request.json()

      const doc = await cms.update(collectionName, id, data, user)

      return NextResponse.json(doc)
    } catch (error) {
      return handleError(error)
    }
  }

  /**
   * DELETE /api/collections/[collection]/[id] - Delete document
   */
  async function DELETE(request: NextRequest, context: RouteContext) {
    try {
      const user = await getUser(cms, request)
      const params = await context.params
      const id = params.id

      await cms.delete(collectionName, id, user)

      return NextResponse.json({ success: true })
    } catch (error) {
      return handleError(error)
    }
  }

  return { GET, PATCH, DELETE }
}

/**
 * Get user from request (using better-auth session)
 */
async function getUser(cms: TinyCMS, request: NextRequest) {
  try {
    const session = await cms.auth.getSession(request.headers)
    return session?.user
  } catch {
    // Auth not configured or no session
    return undefined
  }
}

/**
 * Handle errors and return appropriate response
 */
function handleError(error: unknown) {
  console.error('API Error:', error)

  if (error instanceof Error) {
    // Access denied errors
    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // Validation errors
    if (error.message.includes('Validation failed')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Generic error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
