import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const PAGE_SIZE = 20

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('pages')
    .select('slug, created_at, expires_at, locked, view_count, report_count, deleted_at', { count: 'exact' })

  if (filter === 'locked')   query = query.eq('locked', true).is('deleted_at', null)
  if (filter === 'reported') query = query.gt('report_count', 0).is('deleted_at', null)
  if (filter === 'deleted')  query = query.not('deleted_at', 'is', null)

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
}
