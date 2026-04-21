import { getSupabaseAdmin } from '@/lib/supabase-server'

async function getStats() {
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

  const totalRevenue = revenueRows?.reduce((sum: number, r: { amount: number | null }) => sum + (r.amount ?? 0), 0) ?? 0

  return {
    totalPages: totalPages ?? 0,
    activePages: activePages ?? 0,
    lockedPages: lockedPages ?? 0,
    deletedPages: deletedPages ?? 0,
    totalPayments: totalPayments ?? 0,
    totalRevenue,
    recentReports: recentReports ?? 0,
    newToday: newToday ?? 0,
  }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-popup-border bg-popup-white p-5">
      <p className="text-xs text-popup-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-popup-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-popup-faint">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const stats = await getStats()
  const revenue = stats.totalRevenue.toLocaleString('ko-KR') + '원'

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-popup-text">개요</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="전체 페이지" value={stats.totalPages} sub={`활성 ${stats.activePages}`} />
        <StatCard label="잠금 페이지" value={stats.lockedPages} />
        <StatCard label="삭제 페이지" value={stats.deletedPages} />
        <StatCard label="오늘 생성" value={stats.newToday} />
        <StatCard label="총 결제" value={`${stats.totalPayments}건`} />
        <StatCard label="총 매출" value={revenue} />
        <StatCard label="최근 7일 신고" value={stats.recentReports} />
      </div>
    </div>
  )
}
