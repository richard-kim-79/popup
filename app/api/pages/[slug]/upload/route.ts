import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import { checkStorageQuota } from '@/lib/subscription'
import {
  ALLOWED_MIME, ALLOWED_VIDEO_MIME, MEDIA_MAX_SIZE, ensureBucket, createMediaUpload,
} from '@/lib/media-bucket'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

interface SignedUploadRequest {
  filename: string
  mimeType: string
  size: number
}

interface SignedUploadResponse {
  signedUrl: string
  token: string
  path: string
  publicUrl: string
  filename: string
  isVideo: boolean
}

/** Signed URL 발급 — 파일은 클라이언트가 직접 Supabase에 PUT */
export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<SignedUploadResponse | ApiError>> {
  const { slug } = await params
  const editToken = req.headers.get('x-edit-token')

  if (!editToken || !verifyEditToken(editToken, slug)) {
    return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 })
  }

  let body: SignedUploadRequest
  try {
    body = await req.json() as SignedUploadRequest
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { filename, mimeType, size } = body

  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `지원하지 않는 형식입니다: ${mimeType}\n(지원: 이미지·PDF·mp4·mov·webm)` },
      { status: 400 }
    )
  }

  const isVideo  = ALLOWED_VIDEO_MIME.has(mimeType)
  const maxSize  = MEDIA_MAX_SIZE
  const limitMB  = `${Math.round(maxSize / 1024 / 1024)}MB`

  if (size > maxSize) {
    return NextResponse.json(
      { error: `파일 크기 초과: ${limitMB} 이하여야 합니다.\n(실제: ${Math.round(size / 1024 / 1024)}MB)` },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  // 페이지 소유자의 티어별 저장 용량 한도 사전 체크 (로그인 사용자만)
  const { data: page } = await supabase
    .from('pages')
    .select('user_id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (page?.user_id) {
    const quota = await checkStorageQuota(supabase, page.user_id, size)
    if (quota && !quota.allowed) {
      return NextResponse.json(
        { error: quota.reason ?? '저장 용량을 초과했습니다.' },
        { status: 413 },
      )
    }
  }

  try {
    await ensureBucket(supabase)
    const up = await createMediaUpload(supabase, slug, filename)
    return NextResponse.json({ ...up, filename, isVideo })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
