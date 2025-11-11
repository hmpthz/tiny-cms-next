/**
 * Catch-all API route handler using Hono
 * Delegates all /api/* requests to the CMS Hono app
 */

import { createHonoHandler } from '@tiny-cms/next'
import { getCMS } from '@/lib/cms'

// Create the Hono handler
const handler = createHonoHandler(getCMS())

// Export handlers for all HTTP methods
export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
