/**
 * Storage plugin for tiny-cms
 * Adds storage adapter to CMS config and registers upload routes
 */

import type { Hono, Context } from 'hono'
import type { Config, Plugin, CMSVariables } from '@tiny-cms/core'
import type { StorageAdapter, UploadedFile } from './types'

export interface StoragePluginOptions {
  /** Storage adapter to use */
  adapter: StorageAdapter
  /** Base path for upload routes (default: /api/upload) */
  basePath?: string
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number
  /** Allowed MIME types (default: images) */
  allowedTypes?: string[]
}

/**
 * Create storage plugin
 * This plugin adds storage capabilities to the CMS by injecting a storage adapter
 * and registering upload/delete routes
 */
export function storagePlugin(options: StoragePluginOptions) {
  const {
    adapter,
    basePath = '/api/upload',
    maxFileSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  } = options

  // Create plugin function with route registration
  const plugin: Plugin = (config: Config) => {
    return config
  }

  // Add route registration using type assertion
  plugin.registerRoutes = (app: Hono) => {
    // Upload route
    app.post(basePath, async (c: Context<{ Variables: CMSVariables }>) => {
      try {
        // Parse multipart form data
        const formData = await c.req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
          return c.json({ error: 'No file provided' }, 400)
        }

        // Validate file size
        if (file.size > maxFileSize) {
          return c.json({ error: `File size exceeds maximum of ${maxFileSize} bytes` }, 400)
        }

        // Validate file type
        if (!allowedTypes.includes(file.type)) {
          return c.json({ error: `File type ${file.type} not allowed` }, 400)
        }

        // Convert File to UploadedFile format
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploadedFile: UploadedFile = {
          buffer,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        }

        // Get prefix from form data if provided
        const prefix = formData.get('prefix') as string | undefined

        // Upload file using adapter
        const path = await adapter.handleUpload({
          file: uploadedFile,
          prefix,
        })

        // Generate public URL
        const url = adapter.generateURL({
          filename: file.name,
          prefix,
        })

        // Create media document in CMS if collection exists
        const cms = c.get('cms')
        if (cms) {
          try {
            // Check if media collection exists
            const config = cms.getConfig()
            const hasMediaCollection = config.collections.some(
              (col: any) => col.name === 'media' || col.slug === 'media',
            )

            if (hasMediaCollection) {
              await cms.create('media', {
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                path,
                url,
              })
            }
          } catch (error) {
            // Log but don't fail the upload
            console.error('Failed to create media document:', error)
          }
        }

        return c.json({
          success: true,
          path,
          url,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        })
      } catch (error) {
        console.error('Upload error:', error)
        return c.json({ error: `Upload failed: ${(error as Error).message}` }, 500)
      }
    })

    // Delete route
    app.delete(basePath, async (c: Context<{ Variables: CMSVariables }>) => {
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
    })

    // Get signed URL route (if adapter supports it)
    if (adapter.generateSignedURL) {
      app.post(`${basePath}/signed-url`, async (c: Context<{ Variables: CMSVariables }>) => {
        try {
          const body = await c.req.json()
          const { filename, prefix, expiresIn } = body

          if (!filename) {
            return c.json({ error: 'Filename is required' }, 400)
          }

          const result = await adapter.generateSignedURL!({
            filename,
            prefix,
            expiresIn,
          })

          return c.json(result)
        } catch (error) {
          console.error('Signed URL error:', error)
          return c.json(
            { error: `Failed to generate signed URL: ${(error as Error).message}` },
            500,
          )
        }
      })
    }
  }

  return plugin
}
