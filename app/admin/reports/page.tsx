'use client'

import { useEffect, useState, useCallback } from 'react'

interface ReportRow {
  id: string
  reason: string
  detail: string | null
  created_at: string
  page_id: string
  pages: { slug: string; report_count: number } | null
}

const REASON_LABEL: Record<string, string> = {
  illegal: '불법', spam: '스팸', adult: '성인', other: '기타',
}

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/reports')
      .then((r) => r.json())
      .then((d: { data: ReportRow[] }) => setRows(d.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const deletePage = async (slug: string) => {
    if (!confirm(`/${slug} 페이지를 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/pages/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    fetchReports()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-popup-text">신고 관리</h1>
        <span className="text-sm text-popup-muted">총 {rows.length}건</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-popup-border bg-popup-white">
        <table className="w-full text-sm">
          <thead className="border-b border-popup-border bg-popup-bg">
            <tr>
              {['페이지', '신고수', '이유', '상세', '신고일', '액션'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-popup-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-popup-faint">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-popup-faint">신고가 없습니다.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-popup-border last:border-0 hover:bg-popup-bg">
                <td className="px-4 py-3">
                  {row.pages?.slug ? (
                    <a href={`/${row.pages.slug}`} target="_blank" className="font-mono text-popup-accent underline">
                      {row.pages.slug}
                    </a>
                  ) : <span className="text-popup-faint">(삭제됨)</span>}
                </td>
                <td className={`px-4 py-3 font-bold ${(row.pages?.report_count ?? 0) >= 3 ? 'text-red-500' : 'text-popup-warn'}`}>
                  {row.pages?.report_count ?? '-'}
                </td>
                <td className="px-4 py-3">{REASON_LABEL[row.reason] ?? row.reason}</td>
                <td className="px-4 py-3 text-popup-muted">{row.detail ?? '-'}</td>
                <td className="px-4 py-3 text-popup-muted">
                  {new Date(row.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3">
                  {row.pages?.slug && (
                    <button onClick={() => deletePage(row.pages!.slug)}
                      className="text-xs text-red-500 hover:underline">
                      페이지 삭제
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
