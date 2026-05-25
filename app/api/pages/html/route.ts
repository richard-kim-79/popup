import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase-server'
import { hashPin } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import { generateUniqueSlug } from '@/lib/slug'
import type { CreatePageResponse, ApiError } from '@/types'

const MAX_HTML_BYTES = 500_000 // 500 KB

export async function POST(
  req: NextRequest,
): Promise<NextResponse<CreatePageResponse | ApiError>> {
  const body = await req.json().catch(() => null) as {
    html?: unknown
    pin?: unknown
  } | null

  // PIN 검증
  if (!body?.pin || typeof body.pin !== 'string' || body.pin.length < 4 || body.pin.length > 8) {
    return NextResponse.json({ error: 'PIN은 4~8자리여야 합니다.' }, { status: 400 })
  }

  // HTML 검증
  if (!body?.html || typeof body.html !== 'string' || body.html.length === 0) {
    return NextResponse.json({ error: 'html 필드가 필요합니다.' }, { status: 400 })
  }
  if (Buffer.byteLength(body.html, 'utf8') > MAX_HTML_BYTES) {
    return NextResponse.json({ error: 'HTML 크기는 500KB를 초과할 수 없습니다.' }, { status: 400 })
  }

  // 로그인 세션이 있으면 user_id 자동 연결
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id ?? null

  const supabase = getSupabaseAdmin()
  const slug = await generateUniqueSlug()
  const pin_hash = await hashPin(body.pin)

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
  })

  if (error) {
    return NextResponse.json({ error: '페이지 생성에 실패했습니다.' }, { status: 500 })
  }

  const editToken = issueEditToken(slug)
  return NextResponse.json({ slug, editToken }, { status: 201 })
}
