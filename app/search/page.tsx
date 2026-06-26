'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/app/api/search/route'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com'

interface Suggestion { slug: string; title: string }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [trending, setTrending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggest, setShowSuggest] = useState(false)

  const resultsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const json = await res.json() as { pages: SearchResult[]; total: number; trending?: boolean }
        setResults(json.pages)
        setTotal(json.total)
        setTrending(!!json.trending)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기: 트렌딩 로드
  useEffect(() => {
    fetchResults('').then(() => setInitialLoaded(true))
  }, [fetchResults])

  // 결과 디바운스
  useEffect(() => {
    if (!initialLoaded) return
    if (resultsDebounce.current) clearTimeout(resultsDebounce.current)
    resultsDebounce.current = setTimeout(() => fetchResults(query), 320)
    return () => { if (resultsDebounce.current) clearTimeout(resultsDebounce.current) }
  }, [query, fetchResults, initialLoaded])

  // 자동완성 디바운스 (빠르게)
  useEffect(() => {
    const q = query.trim()
    if (!q) { setSuggestions([]); return }
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current)
    suggestDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const json = await res.json() as { suggestions: Suggestion[] }
          setSuggestions(json.suggestions)
        }
      } catch { /* ignore */ }
    }, 140)
    return () => { if (suggestDebounce.current) clearTimeout(suggestDebounce.current) }
  }, [query])

  return (
    <div className="min-h-screen bg-popup-bg">
      {/* PGroonga 스니펫 하이라이트 */}
      <style>{`.keyword{color:#2A6049;font-weight:600;background:#EDF5F1;border-radius:2px;padding:0 1px}`}</style>

      <nav className="flex h-12 items-center justify-between border-b border-popup-border bg-popup-white px-4">
        <Link href="/" className="text-sm font-bold text-popup-text">Popup</Link>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-popup-text">Popup 검색</h1>

        {/* 검색창 + 자동완성 */}
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
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            className="w-full rounded-xl border border-popup-border bg-popup-white py-3 pl-10 pr-4 text-sm text-popup-text outline-none ring-0 transition focus:border-popup-accent focus:ring-1 focus:ring-popup-accent/40"
            autoFocus
          />

          {showSuggest && query.trim() && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-popup-border bg-popup-white shadow-lg">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <a
                    href={`${BASE}/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-popup-text hover:bg-popup-bg"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="truncate">{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 결과 헤더 */}
        {!loading && (
          <p className="mb-3 text-xs text-popup-muted">
            {trending
              ? '🔥 인기 페이지'
              : `"${query.trim()}" 검색 결과 ${total}건`}
          </p>
        )}

        {loading && <div className="py-12 text-center text-sm text-popup-muted">검색 중…</div>}

        {!loading && results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-popup-muted">
              {query.trim() ? '검색 결과가 없어요.' : '아직 등록된 페이지가 없어요.'}
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
                  className="block rounded-xl border border-popup-border bg-popup-white p-4 transition-colors hover:border-popup-accent/50 hover:bg-popup-bg"
                >
                  <p className="truncate text-sm font-semibold text-popup-text">{p.listing_title}</p>
                  {p.snippet ? (
                    <p
                      className="mt-1 line-clamp-2 text-xs leading-relaxed text-popup-muted"
                      dangerouslySetInnerHTML={{ __html: p.snippet }}
                    />
                  ) : p.listing_description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-popup-muted">{p.listing_description}</p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-popup-faint">
                    popup2026.com/{p.slug} · {formatDate(p.listed_at)}
                    {p.view_count > 0 && <> · 조회 {p.view_count.toLocaleString()}</>}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
