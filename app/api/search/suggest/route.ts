import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

interface Suggestion { slug: string; title: string }

/** GET /api/search/suggest?q= — 입력 중 자동완성(상위 매칭 페이지 제목) */
export async function GET(req: NextRequest): Promise<NextResponse<{ suggestions: Suggestion[] }>> {
  const raw = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const q = raw.replace(/["'()\\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!q) return NextResponse.json({ suggestions: [] })

  const supabase = getSupabaseAdmin()
  const callRpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: Array<{ slug: string; listing_title: string }> | null; error: unknown }>

  const { data, error } = await callRpc('search_pages', { p_q: q, p_limit: 6, p_offset: 0 })
  if (error) return NextResponse.json({ suggestions: [] })

  const suggestions: Suggestion[] = (data ?? [])
    .filter((r) => r.listing_title)
    .map((r) => ({ slug: r.slug, title: r.listing_title }))
  return NextResponse.json({ suggestions })
}
