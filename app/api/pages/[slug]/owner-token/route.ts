// ============================================================
// 소유자 편집 토큰 — 로그인 소유자는 PIN 없이 editToken 발급
// POST /api/pages/[slug]/owner-token
// 인증: 로그인 세션 사용자가 페이지 소유자(user_id 일치)
// ============================================================

import { NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { issueEditToken } from '@/lib/token'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

export async function POST(
  _req: Request,
  { params }: Params,
): Promise<NextResponse<{ editToken: string } | ApiError>> {
  const { slug } = await params

  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: page } = await admin
    .from('pages')
    .select('user_id, deleted_at')
    .eq('slug', slug)
    .single()

  if (!page || page.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }
  if (page.user_id !== userId) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  return NextResponse.json({ editToken: issueEditToken(slug) })
}
