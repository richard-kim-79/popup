import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

interface Body {
  editToken?: unknown
}

interface SuccessResponse {
  ok: true
  expiredAt: string
}

/**
 * 사용자가 페이지를 "지금 만료"시키는 API.
 *
 * 정책 v2.2: 별도 영구 삭제 동선 없이, 만료 시작점만 앞당겨 정책 라이프사이클로 진입.
 * - expires_at = NOW(), locked = true
 * - 즉시 보기 차단 (기존 만료 화면 재사용)
 * - 1년 안에 연장하면 복구 가능 (실수 안전망)
 *
 * 인증: editToken OR 로그인 user_id 매칭 — 둘 중 하나만 충족하면 OK
 */
export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<SuccessResponse | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null) as Body | null
  const editToken = typeof body?.editToken === 'string' ? body.editToken : ''

  // 페이지 조회 (인증 검증에 user_id 필요)
  const admin = getSupabaseAdmin()
  const { data: page } = await admin
    .from('pages')
    .select('id, user_id, deleted_at')
    .eq('slug', slug)
    .single()

  if (!page || page.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 인증: editToken OR user_id 매칭 (둘 중 하나라도 통과)
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

  // 만료 적용 — expires_at = NOW() + locked
  const expiredAt = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('pages')
    .update({ expires_at: expiredAt, locked: true })
    .eq('slug', slug)

  if (updateErr) {
    return NextResponse.json({ error: '만료 처리에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, expiredAt })
}
