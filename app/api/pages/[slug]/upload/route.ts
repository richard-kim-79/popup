import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
]
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE ?? '') || 50 * 1024 * 1024 // 기본 50MB (Supabase Free), Pro=5GB
const BUCKET = 'media'

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
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

  if (!ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 })
  }

  if (size > MAX_SIZE) {
    return NextResponse.json({ error: `파일 크기는 ${Math.round(MAX_SIZE / 1024 / 1024)}MB 이하여야 합니다.` }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  await ensureBucket(supabase)

  const ext = filename.split('.').pop() ?? 'bin'
  const path = `${slug}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: `서명 URL 발급 실패: ${error?.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl,
    filename,
  }, { status: 200 })
}
