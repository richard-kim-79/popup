import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(): Promise<NextResponse> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalPages },
    { count: activePages },
    { count: lockedPages },
    { count: deletedPages },
    { count: totalPayments },
    { data: revenueRows },
    { count: recentReports },
    { count: newToday },
  ] = await Promise.all([
    supabase.from('pages').select('*', { count: 'exact', head: true }),
    supabase.from('pages').select('*', { count: 'exact', head: true })
      .is('deleted_at', null).eq('locked', false).gt('expires_at', now),
    supabase.from('pages').select('*', { count: 'exact', head: true })
      .is('deleted_at', null).eq('locked', true),
    supabase.from('pages').select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null),
    supabase.from('payments').select('*', { count: 'exact', head: true })
      .eq('status', 'done'),
    supabase.from('payments').select('amount').eq('status', 'done'),
    supabase.from('reports').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabase.from('pages').select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart),
  ])

  const totalRevenue = revenueRows?.reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0

  return NextResponse.json({
    totalPages: totalPages ?? 0,
    activePages: activePages ?? 0,
    lockedPages: lockedPages ?? 0,
    deletedPages: deletedPages ?? 0,
    totalPayments: totalPayments ?? 0,
    totalRevenue,
    recentReports: recentReports ?? 0,
    newToday: newToday ?? 0,
  })
}
