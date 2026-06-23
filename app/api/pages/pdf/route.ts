import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase-server'
import { randomPinHash } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import { generateUniqueSlug } from '@/lib/slug'
import { checkStorageQuota } from '@/lib/subscription'
import { normalizeSource } from '@/lib/source'
import { logPageEvent } from '@/lib/events'
import { MEDIA_MAX_SIZE, createMediaUpload } from '@/lib/media-bucket'
import type { ApiError, Json } from '@/types'

interface PdfCreateResponse {
  slug: string
  editToken: string
  signedUrl: string
  token: string
  path: string
  publicUrl: string
}

/**
 * PDF 페이지 생성 — 페이지를 만들고 서명 업로드 URL을 발급한다.
 * 클라이언트가 받은 signedUrl에 PDF 바이트를 직접 PUT한 뒤 /{slug}로 이동.
 */
export async function POST(
  req: NextRequest,
): Promise<NextResponse<PdfCreateResponse | ApiError>> {
  const body = await req.json().catch(() => null) as {
    filename?: unknown
    mimeType?: unknown
    size?: unknown
    source?: unknown
  } | null

  const filename = typeof body?.filename === 'string' ? body.filename : ''
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : ''
  const size = typeof body?.size === 'number' ? body.size : 0

  if (mimeType !== 'application/pdf' || !/\.pdf$/i.test(filename)) {
    return NextResponse.json({ error: 'PDF 파일만 올릴 수 있습니다.' }, { status: 400 })
  }
  if (size <= 0 || size > MEDIA_MAX_SIZE) {
    return NextResponse.json(
      { error: `PDF 크기는 ${Math.round(MEDIA_MAX_SIZE / 1024 / 1024)}MB 이하여야 합니다.` },
      { status: 400 },
    )
  }

  // 로그인 세션 → user_id + 용량 한도 사전 체크
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id ?? null

  const supabase = getSupabaseAdmin()
  if (userId) {
    const quota = await checkStorageQuota(supabase, userId, size)
    if (quota && !quota.allowed) {
      return NextResponse.json({ error: quota.reason ?? '저장 용량을 초과했습니다.' }, { status: 413 })
    }
  }

  const slug = await generateUniqueSlug()

  let up
  try {
    up = await createMediaUpload(supabase, slug, filename)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const now = new Date()
  const expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const delete_at = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const title = filename.replace(/\.pdf$/i, '').trim().slice(0, 120) || 'PDF 문서'
  const source = normalizeSource(body?.source)

  const { error } = await supabase.from('pages').insert({
    slug,
    blocks: [] as unknown as Json,
    pdf_url: up.publicUrl,
    listing_title: title,
    pin_hash: await randomPinHash(),
    expires_at,
    delete_at,
    locked: false,
    user_id: userId,
    source,
  })

  if (error) {
    return NextResponse.json({ error: '페이지 생성에 실패했습니다.' }, { status: 500 })
  }

  logPageEvent(supabase, 'created', source, slug)

  const editToken = issueEditToken(slug)
  return NextResponse.json(
    { slug, editToken, signedUrl: up.signedUrl, token: up.token, path: up.path, publicUrl: up.publicUrl },
    { status: 201 },
  )
}
