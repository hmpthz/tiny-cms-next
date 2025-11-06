/**
 * Storage configuration for the blog example
 * Uses Supabase Storage for file uploads
 */

import { createSupabaseAdapter } from '@tiny-cms/storage'

// Create storage adapter with configuration from environment variables
export const storageAdapter = createSupabaseAdapter({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  bucket: process.env.SUPABASE_STORAGE_BUCKET || 'media',
  isPublic: true, // Allow public access to uploaded files
})
