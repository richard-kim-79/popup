import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { UploadResponse, ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
]
const MAX_SIZE = 20 * 1024 * 1024 // 20MB
const BUCKET = 'media'

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
}

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<UploadResponse | ApiError>> {
  const { slug } = await params
  const editToken = req.headers.get('x-edit-token')

  if (!editToken || !verifyEditToken(editToken, slug)) {
    return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: '파일을 첨부해주세요.' }, { status: 400 })
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '파일 크기는 100MB 이하여야 합니다.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // 버킷이 없으면 자동 생성
  await ensureBucket(supabase)

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${slug}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: `업로드 실패: ${error.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, filename: file.name }, { status: 201 })
}
