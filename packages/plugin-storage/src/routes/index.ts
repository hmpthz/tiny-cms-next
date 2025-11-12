/**
 * Storage plugin route handlers
 */

import type { Hono, Context } from 'hono'
import type { TinyCmsHonoEnv } from '@tiny-cms/core'
import type { StorageAdapter } from '../types'

// ============================================================================
// Signed URL Handler
// ============================================================================

interface SignedUrlOptions {
  adapter: StorageAdapter
}

export function createSignedUrlHandler(options: SignedUrlOptions) {
  return async function signedUrlHandler(c: Context<TinyCmsHonoEnv>) {
    const { adapter } = options

    if (!adapter.generateSignedURL) {
      return c.json({ error: 'Storage adapter does not support signed URLs' }, 501)
    }

    try {
      const body = await c.req.json()
      const { filename, prefix, expiresIn } = body

      if (!filename) {
        return c.json({ error: 'Filename is required' }, 400)
      }

      const result = await adapter.generateSignedURL({
        filename,
        prefix,
        expiresIn,
      })

      return c.json(result)
    } catch (error) {
      console.error('Signed URL error:', error)
      return c.json({ error: `Failed to generate signed URL: ${(error as Error).message}` }, 500)
    }
  }
}

// ============================================================================
// Delete Handler
// ============================================================================

interface DeleteHandlerOptions {
  adapter: StorageAdapter
}

export function createDeleteHandler(options: DeleteHandlerOptions) {
  return async function deleteHandler(c: Context<TinyCmsHonoEnv>) {
    const { adapter } = options

    try {
      const body = await c.req.json()
      const { filename, prefix } = body

      if (!filename) {
        return c.json({ error: 'Filename is required' }, 400)
      }

      // Delete file using adapter
      await adapter.handleDelete({
        filename,
        prefix,
      })

      // Delete media document from CMS if collection exists
      const cms = c.get('cms')
      if (cms) {
        try {
          // Find and delete media document
          const result = await cms.find('media', {
            where: { filename: { equals: filename } },
            limit: 1,
          })

          if (result.docs.length > 0) {
            await cms.delete('media', result.docs[0].id)
          }
        } catch (error) {
          // Log but don't fail the delete
          console.error('Failed to delete media document:', error)
        }
      }

      return c.json({ success: true })
    } catch (error) {
      console.error('Delete error:', error)
      return c.json({ error: `Delete failed: ${(error as Error).message}` }, 500)
    }
  }
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerRoutes(app: Hono<TinyCmsHonoEnv>, adapter: StorageAdapter) {
  // Storage routes (without base path prefix - handled by Hono's basePath)
  // Signed URL route for client-side uploads
  app.post('/storage/signed-url', createSignedUrlHandler({ adapter }))

  // Delete route for removing files
  app.delete('/storage/delete', createDeleteHandler({ adapter }))
}
