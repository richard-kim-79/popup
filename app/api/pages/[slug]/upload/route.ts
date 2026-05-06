import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

/** 허용 MIME — 이미지 / PDF / 영상 */
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
])

const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/quicktime',   // .mov — iPhone 기본 포맷
  'video/webm',
  'video/x-m4v',
])

const ALLOWED_MIME = new Set([...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME])

/** 이미지·PDF: 50MB, 영상: 1GB */
const IMAGE_MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE ?? '') || 50 * 1024 * 1024
const VIDEO_MAX_SIZE = parseInt(process.env.VIDEO_MAX_SIZE  ?? '') || 1 * 1024 * 1024 * 1024

const BUCKET = 'media'

// 버킷 초기화 여부 (프로세스 수명 동안 1회만 실행)
let bucketReady = false

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (bucketReady) return

  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)

  const bucketOptions = {
    public: true,
    fileSizeLimit: VIDEO_MAX_SIZE,                      // 1GB (Supabase Pro 이상 적용)
    allowedMimeTypes: [...ALLOWED_MIME],                // 허용 MIME 명시
  }

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, bucketOptions)
    if (error) throw new Error(`버킷 생성 실패: ${error.message}`)
  }
  // 기존 버킷은 건드리지 않음 — 매 요청마다 updateBucket 호출하지 않는다

  bucketReady = true
}

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
  const maxSize  = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE
  const limitMB  = isVideo ? '1,024MB (1GB)' : `${Math.round(IMAGE_MAX_SIZE / 1024 / 1024)}MB`

  if (size > maxSize) {
    return NextResponse.json(
      { error: `파일 크기 초과: ${limitMB} 이하여야 합니다.\n(실제: ${Math.round(size / 1024 / 1024)}MB)` },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  try {
    await ensureBucket(supabase)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const ext  = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${slug}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json(
      { error: `서명 URL 발급 실패: ${error?.message ?? '알 수 없는 오류'}` },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token:     data.token,
    path:      data.path,
    publicUrl,
    filename,
    isVideo,
  })
}
