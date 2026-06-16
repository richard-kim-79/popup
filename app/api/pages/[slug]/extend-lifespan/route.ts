import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import { getUserTier } from '@/lib/subscription'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

type Period = 'month' | 'year'

interface Body {
  editToken?: unknown
  period?: unknown
}

interface SuccessResponse {
  ok: true
  expiresAt: string
  deleteAt: string
}

/** delete_at은 만료 이후 365일 — 정책 v2(만료 → 1년 후 삭제예정) 유지 */
const DELETE_GRACE_DAYS = 365

/**
 * 유료 구독자(Lite/Pro)가 자신의 페이지 수명을 임의로 연장하는 API.
 *
 * - period: 'month'(1개월) | 'year'(1년)
 * - base = max(현재 expires_at, NOW()) — 남은 수명 위에 더함
 * - expires_at += period, delete_at = expires_at + 365일, locked = false
 * - 결제 없음 (구독자 혜택)
 *
 * 인증: editToken OR 로그인 user_id 매칭 (둘 중 하나)
 * 권한: 페이지 소유자(user_id)가 유료 구독(lite/pro)이어야 함
 */
export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<SuccessResponse | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null) as Body | null
  const editToken = typeof body?.editToken === 'string' ? body.editToken : ''
  const period: Period | null = body?.period === 'month' || body?.period === 'year' ? body.period : null

  if (!period) {
    return NextResponse.json({ error: '연장 기간이 올바르지 않습니다.' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: page } = await admin
    .from('pages')
    .select('id, user_id, expires_at, deleted_at')
    .eq('slug', slug)
    .single()

  if (!page || page.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // ── 인증: editToken OR 로그인 user_id 매칭 ──────────────────────
  let authorized = false

  if (editToken && verifyEditToken(editToken, slug)) {
    authorized = true
  }

  if (!authorized) {
    const session = await getSupabaseServer()
    const { data: userData } = await session.auth.getUser()
    const userId = userData?.user?.id
    if (userId && userId === page.user_id) {
      authorized = true
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // ── 권한: 소유자가 유료 구독자여야 함 ──────────────────────────
  if (!page.user_id) {
    return NextResponse.json(
      { error: '수명 연장은 유료 구독자 전용 기능이에요.' },
      { status: 403 },
    )
  }

  const tier = await getUserTier(admin, page.user_id)
  if (tier !== 'lite' && tier !== 'pro') {
    return NextResponse.json(
      { error: '수명 연장은 Lite·Pro 구독자만 사용할 수 있어요.' },
      { status: 403 },
    )
  }

  // ── 수명 계산 — 남은 수명 위에 1개월/1년 추가 ──────────────────
  const now = new Date()
  const current = new Date(page.expires_at)
  const base = current > now ? current : now
  const next = new Date(base.getTime())
  if (period === 'year') next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)

  const expiresAt = next.toISOString()
  const deleteAt = new Date(next.getTime() + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateErr } = await admin
    .from('pages')
    .update({ expires_at: expiresAt, delete_at: deleteAt, locked: false })
    .eq('slug', slug)

  if (updateErr) {
    return NextResponse.json({ error: '수명 연장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, expiresAt, deleteAt })
}
