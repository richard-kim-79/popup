import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(): Promise<NextResponse> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('reports')
    .select('id, reason, detail, created_at, page_id, pages(slug, report_count)')
    .order('created_at', { ascending: false })
    .limit(200)

  return NextResponse.json({ data: data ?? [] })
}
