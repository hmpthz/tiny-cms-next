/**
 * Supabase Storage adapter implementation for tiny-cms
 * Uses @supabase/storage-js for S3-compatible storage
 */

import { StorageClient } from '@supabase/storage-js'
import type {
  StorageAdapter,
  UploadArgs,
  DeleteArgs,
  GenerateURLArgs,
  SignedURLArgs,
  SignedURLResult,
} from '../types'

export interface SupabaseAdapterConfig {
  /** Supabase project URL */
  url: string
  /** Supabase service role key or anon key */
  key: string
  /** Bucket name for file storage */
  bucket: string
  /** Use public bucket (allows unauthenticated access) */
  isPublic?: boolean
}

/**
 * Create a Supabase storage adapter
 * Simplified implementation focusing on essential features
 */
export function createSupabaseAdapter(config: SupabaseAdapterConfig): StorageAdapter {
  const { url, key, bucket, isPublic = true } = config

  // Create storage client
  const storageClient = new StorageClient(url + '/storage/v1', {
    apiKey: key,
    authorization: `Bearer ${key}`,
  })

  const storage = storageClient.from(bucket)

  return {
    name: 'supabase',

    async handleUpload(args: UploadArgs): Promise<string> {
      const { file, prefix = '', metadata = {} } = args

      // Construct file path with prefix
      const filePath = prefix ? `${prefix}/${file.filename}` : file.filename

      // Upload file to Supabase storage
      const { data, error } = await storage.upload(filePath, file.buffer, {
        contentType: file.mimeType,
        cacheControl: '3600', // 1 hour cache
        upsert: false, // Don't overwrite existing files
        // Add custom metadata if supported by your bucket
        ...(Object.keys(metadata).length > 0 && { metadata }),
      })

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`)
      }

      // Return the storage path
      return data.path
    },

    async handleDelete(args: DeleteArgs): Promise<void> {
      const { filename, prefix = '' } = args

      // Construct file path
      const filePath = prefix ? `${prefix}/${filename}` : filename

      // Delete file from storage
      const { error } = await storage.remove([filePath])

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`)
      }
    },

    generateURL(args: GenerateURLArgs): string {
      const { filename, prefix = '', transform } = args

      // Construct file path
      const filePath = prefix ? `${prefix}/${filename}` : filename

      if (isPublic) {
        // Get public URL
        const { data } = storage.getPublicUrl(filePath)

        // Add image transformation parameters if specified
        if (transform && (transform.width || transform.height)) {
          const params = new URLSearchParams()

          if (transform.width) params.append('width', transform.width.toString())
          if (transform.height) params.append('height', transform.height.toString())
          if (transform.quality) params.append('quality', transform.quality.toString())
          if (transform.format) params.append('format', transform.format)

          // Supabase image transformation URL format
          // Uses /render/image/ endpoint for transformations
          const baseUrl = data.publicUrl
          const transformUrl =
            baseUrl.replace('/object/public/', '/render/image/public/') + `?${params.toString()}`

          return transformUrl
        }

        return data.publicUrl
      } else {
        // For private buckets, return a path that requires authentication
        // The application should handle signing these URLs
        return filePath
      }
    },

    async generateSignedURL(args: SignedURLArgs): Promise<SignedURLResult> {
      const { filename, prefix = '', expiresIn = 3600 } = args

      // Construct file path
      const filePath = prefix ? `${prefix}/${filename}` : filename

      // Create signed URL for upload (PUT operation)
      // Using createSignedUploadUrl for direct client-side uploads
      const { data, error } = await storage.createSignedUploadUrl(filePath, {
        upsert: false // Don't overwrite existing files by default
      })

      if (error || !data) {
        throw new Error(`Failed to generate signed upload URL: ${error?.message || 'Unknown error'}`)
      }

      // Return the signed upload URL and token
      // The token can be used with uploadToSignedUrl method
      return {
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        fields: {
          token: data.token,
          path: data.path,
        }
      }
    },
  }
}
