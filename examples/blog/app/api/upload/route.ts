/**
 * File upload API endpoint
 * Handles file uploads to Supabase storage and creates media records
 */

import { NextRequest, NextResponse } from 'next/server'
import { storageAdapter } from '@/lib/storage'
import { cms } from '@/lib/cms'
import { auth } from '@/lib/cms'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (only authors and admins can upload)
    const userRole = session.user.role || 'user'
    if (!['admin', 'author'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const timestamp = Date.now()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${cleanName}`

    // Upload to storage
    const storagePath = await storageAdapter.handleUpload({
      file: {
        buffer,
        filename,
        size: file.size,
        mimeType: file.type,
      },
      prefix: 'uploads',
    })

    // Generate public URL
    const url = storageAdapter.generateURL({
      filename,
      prefix: 'uploads',
    })

    // Get image dimensions if it's an image
    let width: number | undefined
    let height: number | undefined

    if (file.type.startsWith('image/')) {
      // You could use sharp or image-size here to get dimensions
      // For simplicity, we'll skip this for now
    }

    // Create media record in database
    const mediaDoc = await cms.collections.media.create({
      data: {
        filename,
        mimeType: file.type,
        size: file.size,
        url,
        alt: file.name,
        width,
        height,
      },
    })

    return NextResponse.json({
      success: true,
      media: mediaDoc,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle file deletion
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete
    const userRole = session.user.role || 'user'
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'No file ID provided' }, { status: 400 })
    }

    // Get media record
    const media = await cms.collections.media.findById(id)

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Delete from storage
    await storageAdapter.handleDelete({
      filename: media.filename,
      prefix: 'uploads',
    })

    // Delete from database
    await cms.collections.media.delete(id)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
