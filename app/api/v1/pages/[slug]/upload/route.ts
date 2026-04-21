// ============================================================
// Public API v1 — Upload (signed URL 발급)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsPreflightResponse } from '@/lib/cors'
import { authenticateApiKey, isApiError, apiError } from '@/lib/api-key-middleware'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
]
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE ?? '') || 50 * 1024 * 1024
const BUCKET = 'media'

interface Params {
  params: Promise<{ slug: string }>
}

export function OPTIONS() {
  return corsPreflightResponse()
}

/** POST /api/v1/pages/:slug/upload — 파일 업로드 signed URL 발급 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req, 'uploads:create')
  if (isApiError(auth)) return withCors(auth)

  const { slug } = await params

  // 소유권 확인
  const supabase = getSupabaseAdmin()
  const { data: page } = await supabase
    .from('pages')
    .select('id, api_key_id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!page) {
    return withCors(apiError('PAGE_NOT_FOUND', `Page "${slug}" not found`, 404))
  }

  if (page.api_key_id !== auth.id) {
    return withCors(apiError('FORBIDDEN', 'You can only upload to pages created with your API key', 403))
  }

  const body = await req.json().catch(() => null) as {
    filename?: string
    mimeType?: string
    size?: number
  } | null

  if (!body?.filename || !body.mimeType || !body.size) {
    return withCors(apiError('INVALID_INPUT', 'filename, mimeType, and size are required', 400))
  }

  if (!ALLOWED_MIME.includes(body.mimeType)) {
    return withCors(apiError('UNSUPPORTED_TYPE', `Unsupported MIME type. Allowed: ${ALLOWED_MIME.join(', ')}`, 400))
  }

  if (body.size > MAX_SIZE) {
    return withCors(apiError('FILE_TOO_LARGE', `File size must be under ${Math.round(MAX_SIZE / 1024 / 1024)}MB`, 400))
  }

  const ext = body.filename.split('.').pop() ?? 'bin'
  const path = `${slug}/${Date.now()}.${ext}`

  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (signError || !signedData) {
    return withCors(apiError('UPLOAD_FAILED', `Failed to create signed URL: ${signError?.message}`, 500))
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return withCors(
    NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: signedData.path,
      publicUrl,
      filename: body.filename,
    }),
  )
}
