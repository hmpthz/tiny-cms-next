/**
 * Storage adapter types for tiny-cms
 * Simplified from Payload CMS storage architecture
 */

export interface UploadedFile {
  /** File buffer data */
  buffer: Buffer
  /** Original filename */
  filename: string
  /** File size in bytes */
  size: number
  /** MIME type (e.g., 'image/jpeg') */
  mimeType: string
}

export interface UploadArgs {
  /** File to upload */
  file: UploadedFile
  /** Optional path prefix for organization */
  prefix?: string
  /** Additional metadata */
  metadata?: Record<string, string>
}

export interface DeleteArgs {
  /** Filename to delete */
  filename: string
  /** Path prefix where file is stored */
  prefix?: string
}

export interface GenerateURLArgs {
  /** Filename */
  filename: string
  /** Path prefix */
  prefix?: string
  /** Image transformation options (width, height, quality) */
  transform?: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  }
}

export interface SignedURLArgs {
  /** Filename for the signed URL */
  filename: string
  /** Path prefix */
  prefix?: string
  /** Expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number
}

export interface SignedURLResult {
  /** The signed URL for direct upload */
  url: string
  /** Expiration timestamp */
  expiresAt: Date
  /** Additional fields (e.g., token for Supabase) */
  fields?: Record<string, any>
}

/**
 * Storage adapter interface
 * Implementations provide platform-specific storage operations
 */
export interface StorageAdapter {
  /** Adapter name */
  name: string

  /**
   * Upload a file to storage
   * @returns Path where file was stored
   */
  handleUpload(args: UploadArgs): Promise<string>

  /**
   * Delete a file from storage
   */
  handleDelete(args: DeleteArgs): Promise<void>

  /**
   * Generate public URL for a file
   */
  generateURL(args: GenerateURLArgs): string

  /**
   * Generate signed URL for client-side uploads (optional)
   * Useful for bypassing server upload limits
   */
  generateSignedURL?(args: SignedURLArgs): Promise<SignedURLResult>
}

/**
 * Storage configuration options
 */
export interface StorageConfig {
  /** Storage adapter instance */
  adapter: StorageAdapter
  /** Default prefix for all uploads */
  defaultPrefix?: string
  /** Allowed file types (MIME types) */
  allowedTypes?: string[]
  /** Maximum file size in bytes */
  maxFileSize?: number
}
