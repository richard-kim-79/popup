import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface EventRow {
  event_type: string
  source: string | null
  created_at: string
}

const DAYS = 30

/** 채널 라벨 보기 좋게 */
function channelLabel(source: string): string {
  if (source === 'shared') return '공유 페이지 CTA'
  if (source === 'expired') return '만료 페이지 CTA'
  if (source.startsWith('template:')) return `템플릿 · ${source.slice('template:'.length)}`
  return source
}

export default async function GrowthDashboard() {
  const admin = getSupabaseAdmin()
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()

  // 최근 30일 이벤트 (page_events는 Database 타입 밖 → any 캐스트)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventsData } = await (admin as any)
    .from('page_events')
    .select('event_type, source, created_at')
    .gte('created_at', since)
    .limit(20000)

  const rows = (eventsData ?? []) as EventRow[]

  const map = new Map<string, { arrivals: number; created: number }>()
  for (const e of rows) {
    const key = e.source ?? '(직접/없음)'
    const m = map.get(key) ?? { arrivals: 0, created: 0 }
    if (e.event_type === 'arrival') m.arrivals++
    else if (e.event_type === 'created') m.created++
    map.set(key, m)
  }
  const channels = [...map.entries()]
    .map(([source, v]) => ({
      source,
      arrivals: v.arrivals,
      created: v.created,
      conv: v.arrivals > 0 ? v.created / v.arrivals : null,
    }))
    .sort((a, b) => b.created - a.created)

  const totalArrivals = rows.filter((r) => r.event_type === 'arrival').length
  const totalCreated = rows.filter((r) => r.event_type === 'created').length
  const overallConv = totalArrivals > 0 ? totalCreated / totalArrivals : null

  // 전체 기간 생성 출처 분포 (pages.source)
  const { data: srcRows } = await admin
    .from('pages')
    .select('source')
    .is('deleted_at', null)
    .not('source', 'is', null)
    .limit(20000)

  const allTime = new Map<string, number>()
  for (const r of (srcRows ?? []) as { source: string | null }[]) {
    if (r.source) allTime.set(r.source, (allTime.get(r.source) ?? 0) + 1)
  }
  const allTimeArr = [...allTime.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-popup-text">📈 성장 — 채널별 전환</h1>
      <p className="mb-6 text-xs text-popup-muted">최근 {DAYS}일 · 유입(CTA 클릭) → 생성 퍼널</p>

      {/* 요약 카드 */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-popup-border bg-popup-white px-4 py-3">
          <p className="text-[11px] text-popup-muted">유입(arrival)</p>
          <p className="mt-1 text-2xl font-bold text-popup-text">{totalArrivals}</p>
        </div>
        <div className="rounded-xl border border-popup-border bg-popup-white px-4 py-3">
          <p className="text-[11px] text-popup-muted">생성(created)</p>
          <p className="mt-1 text-2xl font-bold text-popup-text">{totalCreated}</p>
        </div>
        <div className="rounded-xl border border-popup-border bg-popup-white px-4 py-3">
          <p className="text-[11px] text-popup-muted">유입→생성 전환율</p>
          <p className="mt-1 text-2xl font-bold text-popup-accent">
            {overallConv === null ? '—' : `${Math.round(overallConv * 100)}%`}
          </p>
        </div>
      </div>

      {/* 채널별 테이블 */}
      <h2 className="mb-2 text-sm font-semibold text-popup-text">채널별 (최근 {DAYS}일)</h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-popup-border bg-popup-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-popup-border text-[11px] text-popup-muted">
              <th className="px-4 py-2 text-left font-medium">채널</th>
              <th className="px-4 py-2 text-right font-medium">유입</th>
              <th className="px-4 py-2 text-right font-medium">생성</th>
              <th className="px-4 py-2 text-right font-medium">전환율</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-popup-faint">아직 데이터가 없어요.</td></tr>
            )}
            {channels.map((c) => (
              <tr key={c.source} className="border-b border-popup-border/60 last:border-0">
                <td className="px-4 py-2.5 text-popup-text">{channelLabel(c.source)}</td>
                <td className="px-4 py-2.5 text-right text-popup-muted">{c.arrivals || '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-popup-text">{c.created}</td>
                <td className="px-4 py-2.5 text-right text-popup-accent">
                  {c.conv === null ? '—' : `${Math.round(c.conv * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 전체 기간 생성 출처 */}
      <h2 className="mb-2 text-sm font-semibold text-popup-text">전체 기간 생성 출처 (pages.source)</h2>
      <div className="overflow-hidden rounded-xl border border-popup-border bg-popup-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-popup-border text-[11px] text-popup-muted">
              <th className="px-4 py-2 text-left font-medium">채널</th>
              <th className="px-4 py-2 text-right font-medium">생성 수</th>
            </tr>
          </thead>
          <tbody>
            {allTimeArr.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-popup-faint">아직 출처가 기록된 페이지가 없어요.</td></tr>
            )}
            {allTimeArr.map((r) => (
              <tr key={r.source} className="border-b border-popup-border/60 last:border-0">
                <td className="px-4 py-2.5 text-popup-text">{channelLabel(r.source)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-popup-text">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
