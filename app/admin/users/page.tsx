'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { TIERS } from '@/lib/tiers'
import type { AdminUserRow } from '@/app/api/admin/users/route'

function fmtBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)}GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)}MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)}KB`
  return `${n}B`
}
function tierLimit(tier: string): number {
  return (TIERS[tier as keyof typeof TIERS] ?? TIERS.free).storageBytes
}
function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('ko-KR') : '-'
}
function isBanned(until: string | null): boolean {
  return !!until && new Date(until) > new Date()
}

const TIER_FILTERS = ['', 'free', 'lite', 'pro']
const STATUS_FILTERS = ['', 'active', 'past_due', 'canceled', 'none']
const SORTS: { v: string; l: string }[] = [
  { v: 'created', l: '가입 최신순' },
  { v: 'pages', l: '페이지 많은순' },
  { v: 'storage', l: '용량 큰순' },
  { v: 'revenue', l: '매출 높은순' },
  { v: 'active', l: '최근 활동순' },
]
const PAGE_SIZE = 25

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('created')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), sort })
    if (search) params.set('q', search)
    if (tier) params.set('tier', tier)
    if (status) params.set('status', status)
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d: { data: AdminUserRow[]; total: number }) => {
        setRows(d.data ?? [])
        setTotal(d.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page, sort, search, tier, status])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = () => setSelected((s) =>
    s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)))

  const bulk = async (action: string) => {
    if (selected.size === 0) return
    const labels: Record<string, string> = {
      ban: '이용 정지', unban: '정지 해제', lock_pages: '페이지 일괄 잠금', hide_gallery: '갤러리 일괄 숨김',
    }
    if (!confirm(`선택한 ${selected.size}명에게 '${labels[action]}'을(를) 실행할까요?`)) return
    setBusy(true)
    try {
      await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], action }),
      })
      setSelected(new Set())
      fetchUsers()
    } finally { setBusy(false) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-popup-text">사용자 관리</h1>
        <span className="text-sm text-popup-muted">{search ? `"${search}" ` : ''}총 {total}명</span>
      </div>

      {/* 검색 + 필터 */}
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }} className="mb-3 flex flex-wrap gap-2">
        <input
          type="text" placeholder="이메일로 검색"
          value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
        />
        <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(1) }}
          className="rounded-lg border border-popup-border bg-popup-white px-2 py-2 text-sm text-popup-text">
          {TIER_FILTERS.map((t) => <option key={t} value={t}>{t === '' ? '티어 전체' : t}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-popup-border bg-popup-white px-2 py-2 text-sm text-popup-text">
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === '' ? '구독상태 전체' : s}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
          className="rounded-lg border border-popup-border bg-popup-white px-2 py-2 text-sm text-popup-text">
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-popup-accent px-4 py-2 text-sm font-medium text-white hover:bg-popup-accent-hover">검색</button>
      </form>

      {/* 일괄 작업 바 */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-popup-accent/40 bg-popup-accent-bg px-3 py-2 text-sm">
          <span className="font-medium text-popup-accent">{selected.size}명 선택됨</span>
          <button disabled={busy} onClick={() => void bulk('ban')} className="rounded bg-red-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">이용 정지</button>
          <button disabled={busy} onClick={() => void bulk('unban')} className="rounded border border-popup-border bg-white px-2.5 py-1 text-xs disabled:opacity-50">정지 해제</button>
          <button disabled={busy} onClick={() => void bulk('lock_pages')} className="rounded border border-popup-border bg-white px-2.5 py-1 text-xs disabled:opacity-50">페이지 잠금</button>
          <button disabled={busy} onClick={() => void bulk('hide_gallery')} className="rounded border border-popup-border bg-white px-2.5 py-1 text-xs disabled:opacity-50">갤러리 숨김</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-popup-muted hover:underline">선택 해제</button>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-popup-border bg-popup-white">
        <table className="w-full text-sm">
          <thead className="border-b border-popup-border bg-popup-bg">
            <tr>
              <th className="w-8 px-3 py-3">
                <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} />
              </th>
              {['이메일', '티어', '구독', '페이지', '용량(한도%)', '매출', '신고/잠금', '가입', '최근활동'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-popup-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-10 text-center text-sm text-popup-faint">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="py-10 text-center text-sm text-popup-faint">사용자가 없습니다.</td></tr>
            ) : rows.map((u) => {
              const used = Number(u.text_bytes) + Number(u.attachment_bytes)
              const pct = Math.round((used / tierLimit(u.tier)) * 100)
              const banned = isBanned(u.banned_until)
              return (
                <tr key={u.id} className="border-b border-popup-border last:border-0 hover:bg-popup-bg">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} /></td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-popup-accent hover:underline">{u.email ?? u.id.slice(0, 8)}</Link>
                    {banned && <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">정지</span>}
                    {u.granted_by_admin && <span className="ml-1.5 rounded bg-popup-accent-bg px-1.5 py-0.5 text-[10px] text-popup-accent">수동</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      u.tier === 'pro' ? 'bg-popup-accent text-white' : u.tier === 'lite' ? 'bg-popup-accent-bg text-popup-accent' : 'text-popup-muted'
                    }`}>{u.tier}</span>
                  </td>
                  <td className="px-3 py-3 text-popup-muted">{u.sub_status ?? '-'}{u.failed_charge_count > 0 && <span className="text-red-500"> ⚠{u.failed_charge_count}</span>}</td>
                  <td className="px-3 py-3">{u.page_count}</td>
                  <td className="px-3 py-3 text-popup-muted">
                    {fmtBytes(used)} <span className={pct >= 80 ? 'text-popup-warn font-medium' : 'text-popup-faint'}>({pct}%)</span>
                  </td>
                  <td className="px-3 py-3 text-popup-muted">{Number(u.revenue_total).toLocaleString()}원</td>
                  <td className="px-3 py-3">
                    <span className={Number(u.report_total) > 0 ? 'text-red-500' : 'text-popup-faint'}>{u.report_total}</span>
                    <span className="text-popup-faint"> / {u.locked_count}</span>
                  </td>
                  <td className="px-3 py-3 text-popup-faint">{fmtDate(u.created_at)}</td>
                  <td className="px-3 py-3 text-popup-faint">{fmtDate(u.last_page_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm text-popup-muted hover:bg-popup-bg disabled:opacity-40">이전</button>
          <span className="flex items-center text-sm text-popup-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm text-popup-muted hover:bg-popup-bg disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  )
}
