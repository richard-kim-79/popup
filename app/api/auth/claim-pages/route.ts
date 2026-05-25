import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { ApiError } from '@/types'

interface ClaimItem {
  slug: string
  token: string
}

interface ClaimBody {
  items?: unknown
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<{ ok: true; claimed: string[] } | ApiError>> {
  const supabase = await getSupabaseServer()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as ClaimBody | null
  const items = Array.isArray(body?.items) ? body.items as ClaimItem[] : []

  if (items.length === 0) {
    return NextResponse.json({ ok: true, claimed: [] })
  }

  // editToken 검증으로 소유권 확인된 슬러그만 통과
  const validSlugs = items
    .filter((it) => typeof it?.slug === 'string' && typeof it?.token === 'string')
    .filter((it) => verifyEditToken(it.token, it.slug))
    .map((it) => it.slug)

  if (validSlugs.length === 0) {
    return NextResponse.json({ ok: true, claimed: [] })
  }

  // user_id가 NULL인 페이지만 클레임 (이미 다른 계정 소유면 건드리지 않음)
  const admin = getSupabaseAdmin()
  const { data: claimed, error } = await admin
    .from('pages')
    .update({ user_id: userId })
    .in('slug', validSlugs)
    .is('user_id', null)
    .is('deleted_at', null)
    .select('slug')

  if (error) {
    return NextResponse.json({ error: '연결에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, claimed: (claimed ?? []).map((p) => p.slug) })
}
