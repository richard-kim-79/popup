import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export interface SearchResult {
  slug: string
  listing_title: string
  listing_description: string | null
  listed_at: string
  view_count: number
  score: number
  snippet: string | null
}

interface SearchResponse {
  pages: SearchResult[]
  total: number
  trending?: boolean
}

type SearchRow = SearchResult & { total_count: number }

const PAGE_SIZE = 24

/**
 * GET /api/search?q=키워드
 *
 * PGroonga 전문검색(한국어 형태소·부분일치) + 관련도·인기·최신 랭킹 + 스니펫 하이라이트.
 * q 없으면 인기(view_count)·최신 순 "트렌딩" 반환.
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<SearchResponse | { error: string }>> {
  const raw = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  // PGroonga 쿼리 구문 충돌 문자 제거(오류 방지)
  const q = raw.replace(/["'()\\]/g, ' ').replace(/\s+/g, ' ').trim()
  const supabase = getSupabaseAdmin()

  // ── 빈 쿼리: 트렌딩(인기·최신) ──────────────────────────────
  if (!q) {
    const { data, error } = await supabase
      .from('pages')
      .select('slug, listing_title, listing_description, listed_at, view_count')
      .eq('listed', true)
      .is('deleted_at', null)
      .order('view_count', { ascending: false })
      .order('listed_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (error) return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
    const pages: SearchResult[] = (data ?? []).flatMap((p) =>
      p.listing_title && p.listed_at
        ? [{
            slug: p.slug,
            listing_title: p.listing_title,
            listing_description: p.listing_description,
            listed_at: p.listed_at,
            view_count: p.view_count ?? 0,
            score: 0,
            snippet: null,
          }]
        : [],
    )
    return NextResponse.json({ pages, total: pages.length, trending: true })
  }

  // ── 검색: PGroonga RPC ──────────────────────────────────────
  const callRpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: SearchRow[] | null; error: { message: string } | null }>

  const { data, error } = await callRpc('search_pages', { p_q: q, p_limit: PAGE_SIZE, p_offset: 0 })
  if (error) return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })

  const rows = data ?? []
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  const pages: SearchResult[] = rows.map((r) => ({
    slug: r.slug,
    listing_title: r.listing_title,
    listing_description: r.listing_description,
    listed_at: r.listed_at,
    view_count: Number(r.view_count ?? 0),
    score: Number(r.score ?? 0),
    snippet: r.snippet,
  }))
  return NextResponse.json({ pages, total })
}
