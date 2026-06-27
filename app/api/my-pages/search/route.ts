import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

interface MySearchHit { slug: string; snippet: string | null; score: number }

type RpcRow = { slug: string; score: number; snippet: string | null; total_count: number }

/**
 * GET /api/my-pages/search?q= — 내 페이지(비공개 포함) PGroonga 검색
 * 세션 소유자 한정. 관련도순 + 스니펫.
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<{ results: MySearchHit[]; total: number } | { error: string }>> {
  const raw = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const q = raw.replace(/["'()\\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!q) return NextResponse.json({ results: [], total: 0 })

  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const callRpc = admin.rpc.bind(admin) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: RpcRow[] | null; error: { message: string } | null }>

  const { data, error } = await callRpc('search_my_pages', {
    p_user_id: userId, p_q: q, p_limit: 50, p_offset: 0,
  })
  if (error) return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })

  const rows = data ?? []
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  return NextResponse.json({
    results: rows.map((r) => ({ slug: r.slug, snippet: r.snippet, score: Number(r.score) })),
    total,
  })
}
