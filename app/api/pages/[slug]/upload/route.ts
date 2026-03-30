import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { UploadResponse, ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime',
  'application/pdf',
]
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

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
  const ext = file.name.split('.').pop()
  const path = `${slug}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('media')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: '업로드에 실패했습니다.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl }, { status: 201 })
}
