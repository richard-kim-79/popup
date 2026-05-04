import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export interface SearchResult {
  slug: string
  listing_title: string
  listing_description: string | null
  listed_at: string
}

/**
 * GET /api/search?q=키워드
 *
 * 검색 전략 (순서대로 시도):
 *   1. search_vector 전문 검색 (GIN 인덱스, 빠름)
 *      — q 내 단어들을 AND 조건으로 tsvector 매칭
 *   2. 결과 없을 때 ILIKE fallback
 *      — 부분 문자열 매칭 (한글 단어 내 검색 등)
 *
 * q 없으면 최신 등록 순 24개 반환.
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<{ pages: SearchResult[] } | { error: string }>> {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const supabase = getSupabaseAdmin()

  const base = supabase
    .from('pages')
    .select('slug, listing_title, listing_description, listed_at')
    .eq('listed', true)
    .is('deleted_at', null)
    .order('listed_at', { ascending: false })
    .limit(24)

  if (!q) {
    const { data, error } = await base
    if (error) return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
    return NextResponse.json({ pages: toResults(data) })
  }

  // ① 전문 검색: search_vector @@ to_tsquery('simple', ...)
  //   Supabase textSearch type:'plain' → plainto_tsquery (공백=AND, 특수문자 무시)
  const { data: ftsData, error: ftsError } = await base
    .textSearch('search_vector', q, { type: 'plain', config: 'simple' })

  if (ftsError) {
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // ② 전문 검색 결과가 있으면 그대로 반환
  if (ftsData && ftsData.length > 0) {
    return NextResponse.json({ pages: toResults(ftsData) })
  }

  // ③ fallback: ILIKE 부분 문자열 검색
  //    (한글 복합어, 오타, 초성 검색 등 tsvector 미매칭 케이스 대응)
  const { data: likeData, error: likeError } = await supabase
    .from('pages')
    .select('slug, listing_title, listing_description, listed_at')
    .eq('listed', true)
    .is('deleted_at', null)
    .or(
      `listing_title.ilike.%${q}%,listing_description.ilike.%${q}%`
    )
    .order('listed_at', { ascending: false })
    .limit(24)

  if (likeError) {
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ pages: toResults(likeData) })
}

function toResults(
  data: { slug: string; listing_title: string | null; listing_description: string | null; listed_at: string | null }[] | null
): SearchResult[] {
  return (data ?? []).flatMap((p) =>
    p.listing_title && p.listed_at
      ? [{
          slug: p.slug,
          listing_title: p.listing_title,
          listing_description: p.listing_description,
          listed_at: p.listed_at,
        }]
      : []
  )
}
