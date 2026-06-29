import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export interface SearchResult {
  slug: string
  listing_title: string
  listing_description: string | null
  listing_image: string | null
  listed_at: string
  view_count: number
  score: number
  snippet: string | null
}

interface SearchResponse {
  pages: SearchResult[]
  total: number
  page: number
  hasMore: boolean
  trending?: boolean
}

type SearchRow = SearchResult & { total_count: number }

const PAGE_SIZE = 24
const SORTS = new Set(['relevance', 'recent', 'popular'])
// CDN 엣지 캐시 — 동일 쿼리 30초 캐시 + SWR(콜드/DB부하 완화)
const CACHE = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }

/**
 * GET /api/search?q=키워드&page=1&sort=relevance|recent|popular
 *
 * PGroonga 전문검색 + 정렬(관련도/최신/인기) + 페이지네이션 + 썸네일.
 * q 없으면 인기·최신 "트렌딩".
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<SearchResponse | { error: string }>> {
  const sp = req.nextUrl.searchParams
  const raw = sp.get('q')?.trim() ?? ''
  const q = raw.replace(/["'()\\]/g, ' ').replace(/\s+/g, ' ').trim()
  const page = Math.max(1, parseInt(sp.get('page') ?? '1') || 1)
  const sort = SORTS.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'relevance'
  const offset = (page - 1) * PAGE_SIZE
  const supabase = getSupabaseAdmin()

  // ── 빈 쿼리: 트렌딩(인기·최신) ──────────────────────────────
  if (!q) {
    const { data, count, error } = await supabase
      .from('pages')
      .select('slug, listing_title, listing_description, listing_image, listed_at, view_count', { count: 'exact' })
      .eq('listed', true)
      .is('deleted_at', null)
      .lt('report_count', 3)
      .order('view_count', { ascending: false })
      .order('listed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
    const pages: SearchResult[] = (data ?? []).flatMap((p) =>
      p.listing_title && p.listed_at
        ? [{
            slug: p.slug,
            listing_title: p.listing_title,
            listing_description: p.listing_description,
            listing_image: p.listing_image,
            listed_at: p.listed_at,
            view_count: p.view_count ?? 0,
            score: 0,
            snippet: null,
          }]
        : [],
    )
    const total = count ?? pages.length
    return NextResponse.json(
      { pages, total, page, hasMore: offset + pages.length < total, trending: true },
      { headers: CACHE },
    )
  }

  // ── 검색: PGroonga RPC ──────────────────────────────────────
  const callRpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: SearchRow[] | null; error: { message: string } | null }>

  const { data, error } = await callRpc('search_pages', {
    p_q: q, p_limit: PAGE_SIZE, p_offset: offset, p_sort: sort,
  })
  if (error) return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })

  const rows = data ?? []
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  const pages: SearchResult[] = rows.map((r) => ({
    slug: r.slug,
    listing_title: r.listing_title,
    listing_description: r.listing_description,
    listing_image: r.listing_image,
    listed_at: r.listed_at,
    view_count: Number(r.view_count ?? 0),
    score: Number(r.score ?? 0),
    snippet: r.snippet,
  }))
  return NextResponse.json(
    { pages, total, page, hasMore: offset + pages.length < total },
    { headers: CACHE },
  )
}
