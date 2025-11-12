/**
 * SDK extension for storage plugin
 * Adds storage methods directly to TinyCmsSDK prototype
 */
import type { TinyCmsSDK } from '@tiny-cms/core/sdk'

export interface SignedUrlOptions {
  filename: string
  prefix?: string
  expiresIn?: number
  mimeType?: string
}

export interface SignedUrlResult {
  url: string
  fields?: Record<string, string>
  headers?: Record<string, string>
}

// Module augmentation to add type declarations
declare module '@tiny-cms/core/sdk' {
  interface TinyCmsSDK {
    /**
     * Get a signed URL for client-side file upload
     */
    getStorageSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult>

    /**
     * Upload a file directly to storage using a signed URL
     * @param file - The file to upload
     * @param signedUrl - The signed URL from getStorageSignedUrl
     * @param token - Optional token for Supabase uploads
     */
    uploadToStorage(file: File, signedUrl: string, token?: string): Promise<void>

    /**
     * Delete a file from storage
     */
    deleteFromStorage(filename: string, prefix?: string): Promise<void>
  }
}

/**
 * Extend the TinyCmsSDK with storage methods
 * This function should be called when the storage plugin is loaded
 */
export function extendSDK(SDK: typeof TinyCmsSDK) {
  // Add getStorageSignedUrl method
  SDK.prototype.getStorageSignedUrl = async function (
    this: TinyCmsSDK,
    options: SignedUrlOptions,
  ): Promise<SignedUrlResult> {
    return this.request({
      method: 'POST',
      path: '/storage/signed-url',
      body: options,
    })
  }

  // Add uploadToStorage method for client-side upload
  SDK.prototype.uploadToStorage = async function (
    this: TinyCmsSDK,
    file: File,
    signedUrl: string,
    token?: string,
  ): Promise<void> {
    // For Supabase, we can use the token with uploadToSignedUrl
    // For other providers, use direct PUT
    if (token) {
      // This is a Supabase signed URL with token
      // The client should use Supabase client's uploadToSignedUrl method
      // For now, we'll use a direct PUT request to the signed URL
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'false', // Don't overwrite existing files
        },
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }
    } else {
      // Generic signed URL upload (e.g., AWS S3)
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }
    }
  }

  // Add deleteFromStorage method
  SDK.prototype.deleteFromStorage = async function (
    this: TinyCmsSDK,
    filename: string,
    prefix?: string,
  ): Promise<void> {
    await this.request({
      method: 'DELETE',
      path: '/storage/delete',
      body: { filename, prefix },
    })
  }
}

/**
 * Helper function to perform a complete upload flow
 * 1. Get signed URL
 * 2. Upload file directly to storage
 * 3. Create media document (optional)
 */
export async function uploadFile(
  sdk: TinyCmsSDK,
  file: File,
  options?: {
    prefix?: string
    createMediaDoc?: boolean
  },
): Promise<{ url: string; path?: string }> {
  // Get signed URL
  const signedUrlResult = await sdk.getStorageSignedUrl({
    filename: file.name,
    mimeType: file.type,
    prefix: options?.prefix,
  })

  // Upload file directly to storage
  // Pass token if available (for Supabase)
  await sdk.uploadToStorage(file, signedUrlResult.url, signedUrlResult.fields?.token)

  // Optionally create media document
  if (options?.createMediaDoc) {
    await sdk.create({
      collection: 'media',
      data: {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        url: signedUrlResult.url,
        path: signedUrlResult.fields?.path,
        prefix: options.prefix,
      },
    })
  }

  return {
    url: signedUrlResult.url,
    path: signedUrlResult.fields?.path,
  }
}
