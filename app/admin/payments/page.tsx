'use client'

import { useEffect, useState } from 'react'

interface PaymentRow {
  id: string
  order_id: string
  plan: string
  amount: number
  status: string
  customer_email: string | null
  paid_at: string | null
  pages: { slug: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  done: '완료', pending: '대기', failed: '실패', canceled: '취소',
}
const STATUS_COLOR: Record<string, string> = {
  done: 'text-green-600', pending: 'text-yellow-600', failed: 'text-red-500', canceled: 'text-popup-faint',
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = status ? `?status=${status}` : ''
    fetch(`/api/admin/payments${qs}`)
      .then((r) => r.json())
      .then((d: { data: PaymentRow[]; totalRevenue: number }) => {
        setRows(d.data)
        setTotalRevenue(d.totalRevenue)
      })
      .finally(() => setLoading(false))
  }, [status])

  const filters = [
    { value: '', label: '전체' },
    { value: 'done', label: '완료' },
    { value: 'failed', label: '실패' },
    { value: 'canceled', label: '취소' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-popup-text">결제 내역</h1>
        <span className="text-sm font-medium text-popup-accent">
          총 매출 {totalRevenue.toLocaleString('ko-KR')}원
        </span>
      </div>

      {/* 필터 탭 */}
      <div className="mb-4 flex gap-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              status === f.value
                ? 'bg-popup-accent text-popup-accent-fg'
                : 'text-popup-muted hover:bg-popup-bg'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-popup-border bg-popup-white">
        <table className="w-full text-sm">
          <thead className="border-b border-popup-border bg-popup-bg">
            <tr>
              {['주문 ID', '페이지', '플랜', '금액', '상태', '이메일', '결제일'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-popup-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-popup-faint">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-popup-faint">결제 내역이 없습니다.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-popup-border last:border-0 hover:bg-popup-bg">
                <td className="px-4 py-3 font-mono text-xs text-popup-muted">{row.order_id.slice(0, 20)}…</td>
                <td className="px-4 py-3">
                  {row.pages?.slug ? (
                    <a href={`/${row.pages.slug}`} target="_blank" className="text-popup-accent underline">
                      {row.pages.slug}
                    </a>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">{row.plan === 'month' ? '1개월' : '1년'}</td>
                <td className="px-4 py-3 font-medium">{(row.amount ?? 0).toLocaleString('ko-KR')}원</td>
                <td className={`px-4 py-3 font-medium ${STATUS_COLOR[row.status] ?? ''}`}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </td>
                <td className="px-4 py-3 text-popup-muted">{row.customer_email ?? '-'}</td>
                <td className="px-4 py-3 text-popup-muted">
                  {row.paid_at ? new Date(row.paid_at).toLocaleDateString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
