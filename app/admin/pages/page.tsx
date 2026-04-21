'use client'

import { useEffect, useState, useCallback } from 'react'

interface PageRow {
  slug: string
  created_at: string
  expires_at: string | null
  locked: boolean
  view_count: number
  report_count: number
  deleted_at: string | null
}

type Filter = 'all' | 'locked' | 'reported' | 'deleted'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'locked', label: '잠금' },
  { value: 'reported', label: '신고됨' },
  { value: 'deleted', label: '삭제됨' },
]

export default function AdminPagesPage() {
  const [rows, setRows] = useState<PageRow[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchPages = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/pages?filter=${filter}&page=${page}`)
      .then((r) => r.json())
      .then((d: { data: PageRow[]; total: number }) => {
        setRows(d.data)
        setTotal(d.total)
      })
      .finally(() => setLoading(false))
  }, [filter, page])

  useEffect(() => { fetchPages() }, [fetchPages])

  const action = async (slug: string, act: 'delete' | 'restore' | 'unlock') => {
    await fetch(`/api/admin/pages/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    fetchPages()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-popup-text">페이지 관리</h1>
        <span className="text-sm text-popup-muted">총 {total}개</span>
      </div>

      {/* 필터 탭 */}
      <div className="mb-4 flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1) }}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filter === f.value
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
              {['슬러그', '생성일', '만료일', '조회', '신고', '상태', '액션'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-popup-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-popup-faint">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-popup-faint">페이지가 없습니다.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.slug} className="border-b border-popup-border last:border-0 hover:bg-popup-bg">
                <td className="px-4 py-3">
                  <a href={`/${row.slug}`} target="_blank" className="font-mono text-popup-accent underline">
                    {row.slug}
                  </a>
                </td>
                <td className="px-4 py-3 text-popup-muted">
                  {new Date(row.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-popup-muted">
                  {row.expires_at ? new Date(row.expires_at).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td className="px-4 py-3">{row.view_count}</td>
                <td className={`px-4 py-3 font-medium ${row.report_count > 0 ? 'text-red-500' : 'text-popup-faint'}`}>
                  {row.report_count}
                </td>
                <td className="px-4 py-3">
                  {row.deleted_at ? (
                    <span className="text-red-400">삭제됨</span>
                  ) : row.locked ? (
                    <span className="text-popup-warn">잠금</span>
                  ) : (
                    <span className="text-green-600">활성</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {row.deleted_at ? (
                      <button onClick={() => action(row.slug, 'restore')}
                        className="text-xs text-popup-accent hover:underline">복원</button>
                    ) : (
                      <>
                        {row.locked && (
                          <button onClick={() => action(row.slug, 'unlock')}
                            className="text-xs text-popup-accent hover:underline">잠금해제</button>
                        )}
                        <button onClick={() => action(row.slug, 'delete')}
                          className="text-xs text-red-500 hover:underline">삭제</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm text-popup-muted hover:bg-popup-bg disabled:opacity-40">
            이전
          </button>
          <span className="flex items-center text-sm text-popup-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm text-popup-muted hover:bg-popup-bg disabled:opacity-40">
            다음
          </button>
        </div>
      )}
    </div>
  )
}
