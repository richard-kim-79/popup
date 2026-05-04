'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/app/api/search/route'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com'

/** URL 또는 slug 문자열에서 slug 추출 */
function extractSlug(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed)
    // popup2026.com/{slug} 형태
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 1) return parts[0]
  } catch {
    // plain slug
  }
  return trimmed.replace(/^\//, '')
}

/** 날짜 포맷: "2026. 4. 28." */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  // 등록 폼 상태
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regUrl, setRegUrl] = useState('')
  const [regPin, setRegPin] = useState('')
  const [regTitle, setRegTitle] = useState('')
  const [regDesc, setRegDesc] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

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

  // 최초 로드: 최신 등록 페이지
  useEffect(() => {
    fetchResults('').then(() => setInitialLoaded(true))
  }, [fetchResults])

  // 검색어 변경 시 debounce 검색
  useEffect(() => {
    if (!initialLoaded) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(query)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults, initialLoaded])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    setRegSuccess(false)

    const slug = extractSlug(regUrl)
    if (!slug) { setRegError('URL을 입력해주세요.'); return }
    if (!regPin) { setRegError('PIN을 입력해주세요.'); return }
    if (!regTitle.trim()) { setRegError('제목을 입력해주세요.'); return }

    setRegLoading(true)
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(slug)}/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: regPin,
          listing_title: regTitle.trim(),
          listing_description: regDesc.trim() || undefined,
        }),
      })
      const json = await res.json() as { listed?: boolean; error?: string }
      if (!res.ok) {
        setRegError(json.error ?? '등록에 실패했습니다.')
      } else {
        setRegSuccess(true)
        setRegUrl(''); setRegPin(''); setRegTitle(''); setRegDesc('')
        // 결과 새로고침
        fetchResults(query)
      }
    } catch {
      setRegError('네트워크 오류가 발생했습니다.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-popup-bg">
      {/* Nav */}
      <nav className="flex h-12 items-center justify-between border-b border-popup-border bg-popup-white px-6">
        <Link href="/" className="text-sm font-bold text-popup-text">Popup</Link>
        <span className="text-xs text-popup-muted">검색</span>
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
            placeholder="제목이나 설명으로 검색…"
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
          <div className="py-12 text-center text-sm text-popup-muted">
            {query ? '검색 결과가 없어요.' : '아직 등록된 페이지가 없어요.'}
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="mb-10 space-y-3">
            {results.map((p) => (
              <li key={p.slug}>
                <a
                  href={`${BASE}/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 rounded-xl border border-popup-border bg-popup-white p-4 transition-colors hover:border-popup-accent/50 hover:bg-popup-bg"
                >
                  {/* 아이콘 */}
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

        {/* 구분선 */}
        <hr className="mb-6 border-popup-border" />

        {/* 내 페이지 등록 */}
        <div>
          <button
            onClick={() => setRegisterOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-popup-border bg-popup-white px-5 py-4 text-left transition-colors hover:bg-popup-bg"
          >
            <span className="text-sm font-semibold text-popup-text">내 Popup 페이지 등록하기</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              className={`text-popup-muted transition-transform duration-200 ${registerOpen ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {registerOpen && (
            <div className="mt-2 rounded-xl border border-popup-border bg-popup-white p-5">
              <p className="mb-4 text-xs text-popup-muted">
                Popup URL과 PIN을 입력하면 검색 디렉토리에 등록됩니다.
                이미 등록된 경우 제목·설명을 업데이트합니다.
              </p>

              {regSuccess ? (
                <div className="rounded-lg bg-popup-accent-bg px-4 py-3 text-sm font-medium text-popup-accent">
                  ✓ 등록이 완료되었어요!
                  <button
                    onClick={() => setRegSuccess(false)}
                    className="ml-3 text-xs underline opacity-70 hover:opacity-100"
                  >
                    다시 등록
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-popup-text">Popup URL</label>
                    <input
                      type="text"
                      placeholder="popup2026.com/abc123"
                      value={regUrl}
                      onChange={(e) => setRegUrl(e.target.value)}
                      className="w-full rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-popup-text">PIN</label>
                    <input
                      type="password"
                      placeholder="편집 시 사용하는 PIN"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="w-full rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-popup-text">제목 <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      placeholder="검색 결과에 표시될 제목"
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value)}
                      maxLength={80}
                      className="w-full rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-popup-text">설명 <span className="text-popup-faint">(선택)</span></label>
                    <textarea
                      placeholder="페이지를 한 줄로 소개해주세요"
                      value={regDesc}
                      onChange={(e) => setRegDesc(e.target.value)}
                      rows={2}
                      maxLength={200}
                      className="w-full resize-none rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
                    />
                  </div>

                  {regError && (
                    <p className="text-xs text-red-500">{regError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-popup-accent-hover disabled:opacity-40"
                  >
                    {regLoading ? '등록 중…' : '등록하기'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
