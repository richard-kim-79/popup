'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/app/api/search/route'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com'

/** 날짜 포맷: "2026. 4. 28." */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR')
}

/* ── 검색 페이지 ─────────────────────────────────────────── */
export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const json = await res.json() as { pages: SearchResult[] }
        setResults(json.pages)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResults('').then(() => setInitialLoaded(true))
  }, [fetchResults])

  useEffect(() => {
    if (!initialLoaded) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchResults, initialLoaded])

  return (
    <div className="min-h-screen bg-popup-bg">

      {/* ── 네비게이션 ── */}
      <nav className="flex h-12 items-center justify-between border-b border-popup-border bg-popup-white px-4">
        <Link href="/" className="text-sm font-bold text-popup-text">Popup</Link>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-10">

        {/* 헤딩 */}
        <h1 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-popup-text">
          Popup 검색
        </h1>

        {/* 검색창 */}
        <div className="relative mb-8">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-popup-muted">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <input
            type="search"
            placeholder="제목·내용으로 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-popup-border bg-popup-white py-3 pl-10 pr-4 text-sm text-popup-text outline-none ring-0 transition focus:border-popup-accent focus:ring-1 focus:ring-popup-accent/40"
            autoFocus
          />
        </div>

        {/* 결과 */}
        {loading && (
          <div className="py-12 text-center text-sm text-popup-muted">검색 중…</div>
        )}

        {!loading && results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-popup-muted">
              {query ? '검색 결과가 없어요.' : '아직 등록된 페이지가 없어요.'}
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="space-y-3">
            {results.map((p) => (
              <li key={p.slug}>
                <a
                  href={`${BASE}/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 rounded-xl border border-popup-border bg-popup-white p-4 transition-colors hover:border-popup-accent/50 hover:bg-popup-bg"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-popup-accent-bg text-popup-accent">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M7 9h10M7 13h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-popup-text">{p.listing_title}</p>
                    {p.listing_description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-popup-muted">{p.listing_description}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-popup-faint">
                      popup2026.com/{p.slug} · {formatDate(p.listed_at)}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-1 shrink-0 text-popup-faint">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  )
}
