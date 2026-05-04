import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export interface SearchResult {
  slug: string
  listing_title: string
  listing_description: string | null
  listed_at: string
}

export async function GET(req: NextRequest): Promise<NextResponse<{ pages: SearchResult[] } | { error: string }>> {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('pages')
    .select('slug, listing_title, listing_description, listed_at')
    .eq('listed', true)
    .is('deleted_at', null)
    .order('listed_at', { ascending: false })
    .limit(24)

  if (q) {
    query = query.or(`listing_title.ilike.%${q}%,listing_description.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // listing_title이 null인 행은 제외 (타입 안전성)
  const pages: SearchResult[] = (data ?? []).flatMap((p) =>
    p.listing_title && p.listed_at
      ? [{ slug: p.slug, listing_title: p.listing_title, listing_description: p.listing_description, listed_at: p.listed_at }]
      : []
  )

  return NextResponse.json({ pages })
}
