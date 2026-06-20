import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase-server'
import { randomPinHash } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import { generateUniqueSlug } from '@/lib/slug'
import { checkStorageQuota } from '@/lib/subscription'
import { normalizeSource } from '@/lib/source'
import { logPageEvent } from '@/lib/events'
import type { CreatePageResponse, ApiError } from '@/types'

const MAX_HTML_BYTES = 5_000_000 // 5 MB

export async function POST(
  req: NextRequest,
): Promise<NextResponse<CreatePageResponse | ApiError>> {
  const body = await req.json().catch(() => null) as {
    html?: unknown
    source?: unknown
  } | null

  // HTML 검증
  if (!body?.html || typeof body.html !== 'string' || body.html.length === 0) {
    return NextResponse.json({ error: 'html 필드가 필요합니다.' }, { status: 400 })
  }
  if (Buffer.byteLength(body.html, 'utf8') > MAX_HTML_BYTES) {
    return NextResponse.json({ error: 'HTML 크기는 5MB를 초과할 수 없습니다.' }, { status: 400 })
  }

  // 로그인 세션이 있으면 user_id 자동 연결
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id ?? null

  const supabase = getSupabaseAdmin()

  // 로그인 사용자: 티어별 저장 용량 한도 사전 체크
  const newBytes = Buffer.byteLength(body.html, 'utf8')
  const quota = await checkStorageQuota(supabase, userId, newBytes)
  if (quota && !quota.allowed) {
    return NextResponse.json(
      { error: quota.reason ?? '저장 용량을 초과했습니다.' },
      { status: 413 },
    )
  }

  const slug = await generateUniqueSlug()
  const pin_hash = await randomPinHash()

  const now = new Date()
  const expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const delete_at  = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('pages').insert({
    slug,
    blocks: [],
    html_content: body.html,
    pin_hash,
    expires_at,
    delete_at,
    locked: false,
    user_id: userId,
    source: normalizeSource(body.source),
  })

  if (error) {
    return NextResponse.json({ error: '페이지 생성에 실패했습니다.' }, { status: 500 })
  }

  // 채널별 전환 측정 — 생성 이벤트 기록 (fire-and-forget)
  logPageEvent(supabase, 'created', normalizeSource(body.source), slug)

  const editToken = issueEditToken(slug)
  return NextResponse.json({ slug, editToken }, { status: 201 })
}
