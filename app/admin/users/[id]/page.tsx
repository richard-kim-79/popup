'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TIERS } from '@/lib/tiers'

interface Detail {
  user: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null; banned_until: string | null }
  tier: string
  usage: { pageCount: number; textBytes: number; storageBytes: number; totalBytes: number }
  subscription: {
    tier: string; status: string; billing_cycle: string; next_charge_at: string | null
    cancel_at_period_end: boolean; failed_charge_count: number; granted_by_admin: boolean
  } | null
  charges: { id: string; amount: number; status: string; attempted_at: string; error_message: string | null }[]
  pages: {
    slug: string; created_at: string; expires_at: string | null; locked: boolean
    listed: boolean; deleted_at: string | null; view_count: number; report_count: number; is_html: boolean
  }[]
}

function fmtBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)}GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)}MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)}KB`
  return `${n}B`
}
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString('ko-KR') : '-'
const isBanned = (until: string | null) => !!until && new Date(until) > new Date()

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-popup-border bg-popup-white p-4">
      <p className="mb-2 text-xs font-medium text-popup-muted">{title}</p>
      <div className="space-y-1 text-sm text-popup-text">{children}</div>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [d, setD] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tierSel, setTierSel] = useState('free')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data: Detail) => { setD(data); setTierSel(data.tier) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const accountAction = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true)
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      load()
    } finally { setBusy(false) }
  }

  const pageAction = async (slug: string, action: string) => {
    await fetch(`/api/admin/pages/${slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    load()
  }

  if (loading) return <p className="text-sm text-popup-muted">불러오는 중...</p>
  if (!d) return <p className="text-sm text-popup-muted">사용자를 찾을 수 없습니다.</p>

  const banned = isBanned(d.user.banned_until)
  const limit = (TIERS[d.tier as keyof typeof TIERS] ?? TIERS.free).storageBytes
  const pct = Math.round((d.usage.totalBytes / limit) * 100)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-popup-muted hover:underline">← 사용자</Link>
        <h1 className="text-lg font-bold text-popup-text">{d.user.email ?? d.user.id}</h1>
        {banned && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">정지됨</span>}
      </div>

      {/* 계정 제어 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-popup-border bg-popup-white p-4">
        <span className="text-xs font-medium text-popup-muted">티어 수동 설정:</span>
        <select value={tierSel} onChange={(e) => setTierSel(e.target.value)}
          className="rounded-lg border border-popup-border bg-popup-bg px-2 py-1.5 text-sm">
          <option value="free">free</option><option value="lite">lite</option><option value="pro">pro</option>
        </select>
        <button disabled={busy} onClick={() => { if (confirm(`티어를 ${tierSel}로 변경할까요?`)) void accountAction('set_tier', { tier: tierSel }) }}
          className="rounded-lg bg-popup-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">적용</button>
        <button disabled={busy} onClick={() => { if (confirm('구독을 취소할까요?')) void accountAction('cancel_subscription') }}
          className="rounded-lg border border-popup-border px-3 py-1.5 text-sm disabled:opacity-50">구독 취소</button>
        {banned
          ? <button disabled={busy} onClick={() => void accountAction('unban')} className="ml-auto rounded-lg border border-popup-border px-3 py-1.5 text-sm disabled:opacity-50">정지 해제</button>
          : <button disabled={busy} onClick={() => { if (confirm('이 사용자를 이용 정지할까요? (로그인 차단)')) void accountAction('ban') }} className="ml-auto rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">이용 정지</button>}
      </div>

      {/* 지표 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card title="사용량">
          <div>페이지 {d.usage.pageCount}개</div>
          <div className={pct >= 80 ? 'text-popup-warn font-medium' : ''}>
            {fmtBytes(d.usage.totalBytes)} / {fmtBytes(limit)} ({pct}%)
          </div>
          <div className="text-xs text-popup-faint">텍스트 {fmtBytes(d.usage.textBytes)} · 첨부 {fmtBytes(d.usage.storageBytes)}</div>
        </Card>
        <Card title="구독·매출">
          <div>티어 <b>{d.tier}</b>{d.subscription?.granted_by_admin && <span className="ml-1 text-xs text-popup-accent">(수동)</span>}</div>
          <div className="text-xs text-popup-muted">상태 {d.subscription?.status ?? '없음'}{d.subscription && d.subscription.failed_charge_count > 0 && <span className="text-red-500"> ⚠{d.subscription.failed_charge_count}</span>}</div>
          <div className="text-xs text-popup-faint">다음 결제 {fmtDate(d.subscription?.next_charge_at ?? null)}</div>
        </Card>
        <Card title="활동">
          <div className="text-xs">가입 {fmtDate(d.user.created_at)}</div>
          <div className="text-xs">최근 로그인 {fmtDate(d.user.last_sign_in_at)}</div>
        </Card>
        <Card title="리스크">
          <div>신고 {d.pages.reduce((s, p) => s + p.report_count, 0)}</div>
          <div className="text-xs text-popup-faint">잠긴 {d.pages.filter((p) => p.locked).length} · 공개 {d.pages.filter((p) => p.listed).length}</div>
        </Card>
      </div>

      {/* 결제 이력 */}
      {d.charges.length > 0 && (
        <div className="rounded-xl border border-popup-border bg-popup-white p-4">
          <p className="mb-2 text-xs font-medium text-popup-muted">결제 이력 (최근 20건)</p>
          <div className="space-y-1 text-xs">
            {d.charges.map((c) => (
              <div key={c.id} className="flex justify-between">
                <span>{fmtDate(c.attempted_at)}</span>
                <span>{c.amount.toLocaleString()}원</span>
                <span className={c.status === 'success' ? 'text-green-600' : 'text-red-500'}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 페이지 목록 */}
      <div className="overflow-x-auto rounded-xl border border-popup-border bg-popup-white">
        <table className="w-full text-sm">
          <thead className="border-b border-popup-border bg-popup-bg">
            <tr>{['슬러그', '생성', '상태', '조회', '신고', '액션'].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-popup-muted">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {d.pages.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-xs text-popup-faint">페이지 없음</td></tr>
            ) : d.pages.map((p) => (
              <tr key={p.slug} className="border-b border-popup-border last:border-0">
                <td className="px-3 py-2.5">
                  <a href={`/${p.slug}`} target="_blank" className="font-mono text-popup-accent underline">{p.slug}</a>
                  {p.is_html && <span className="ml-1 text-[10px] text-popup-faint">HTML</span>}
                </td>
                <td className="px-3 py-2.5 text-popup-faint">{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-3 py-2.5">
                  {p.deleted_at ? <span className="text-red-400">삭제</span>
                    : p.locked ? <span className="text-popup-warn">잠금</span>
                    : <span className="text-green-600">활성</span>}
                  {p.listed && <span className="ml-1 text-[10px] text-popup-accent">공개</span>}
                </td>
                <td className="px-3 py-2.5">{p.view_count}</td>
                <td className={`px-3 py-2.5 ${p.report_count > 0 ? 'text-red-500' : 'text-popup-faint'}`}>{p.report_count}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {p.deleted_at ? (
                      <button onClick={() => pageAction(p.slug, 'restore')} className="text-popup-accent hover:underline">복원</button>
                    ) : (
                      <>
                        {p.locked
                          ? <button onClick={() => pageAction(p.slug, 'unlock')} className="text-popup-accent hover:underline">잠금해제</button>
                          : <button onClick={() => pageAction(p.slug, 'lock')} className="text-popup-warn hover:underline">잠금</button>}
                        {p.listed
                          ? <button onClick={() => pageAction(p.slug, 'hide')} className="text-popup-muted hover:underline">갤러리숨김</button>
                          : <button onClick={() => pageAction(p.slug, 'show')} className="text-popup-muted hover:underline">갤러리공개</button>}
                        <button onClick={() => { if (confirm('삭제할까요?')) pageAction(p.slug, 'delete') }} className="text-red-500 hover:underline">삭제</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
