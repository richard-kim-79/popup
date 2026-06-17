'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/app/api/search/route'
import type { Block, PageResponse } from '@/types'
import { extractHtmlMeta } from '@/lib/html-meta'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com'

/** URL 또는 slug 문자열에서 slug 추출 */
function extractSlug(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length === 1) return parts[0]
  } catch {
    // plain slug
  }
  return trimmed.replace(/^\//, '')
}

/** 블록 배열에서 첫 번째 텍스트 콘텐츠 추출 (h1 → h2 → text) */
function extractTitleFromBlocks(blocks: Block[]): string {
  const priority = ['h1', 'h2', 'text'] as const
  for (const type of priority) {
    const block = blocks.find((b) => b.type === type) as { content?: string } | undefined
    if (block?.content?.trim()) return block.content.trim().slice(0, 80)
  }
  return ''
}

/** 날짜 포맷: "2026. 4. 28." */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR')
}

/* ── 등록 모달 ──────────────────────────────────────────── */
function RegisterModal({
  onClose,
  onSuccess,
  query,
}: {
  onClose: () => void
  onSuccess: () => void
  query: string
}) {
  const [regUrl, setRegUrl] = useState('')
  const [regPin, setRegPin] = useState('')
  const [regTitle, setRegTitle] = useState('')
  const [regDesc, setRegDesc] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [titleFetching, setTitleFetching] = useState(false)
  const [titleAutoFilled, setTitleAutoFilled] = useState(false)
  const titleFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // 모달 열릴 때 첫 필드 포커스
  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [])

  // ESC 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // URL → 제목 자동 추출
  useEffect(() => {
    if (titleFetchRef.current) clearTimeout(titleFetchRef.current)
    const slug = extractSlug(regUrl)
    if (!slug) {
      if (titleAutoFilled) { setRegTitle(''); setTitleAutoFilled(false) }
      return
    }
    titleFetchRef.current = setTimeout(async () => {
      setTitleFetching(true)
      try {
        const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`)
        if (!res.ok) return
        const json = await res.json() as PageResponse
        // 블록 페이지: 첫 H1/H2/text. HTML 페이지: <title>/og:title 에서 추출
        let extracted = extractTitleFromBlocks(json.blocks ?? [])
        if (!extracted && json.htmlContent) {
          const meta = extractHtmlMeta(json.htmlContent)
          if (meta.title) extracted = meta.title.slice(0, 80)
        }
        if (extracted) {
          setRegTitle((prev) => (titleAutoFilled || prev === '') ? extracted : prev)
          setTitleAutoFilled(true)
        }
      } catch { /* 무시 */ }
      finally { setTitleFetching(false) }
    }, 600)
    return () => { if (titleFetchRef.current) clearTimeout(titleFetchRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
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
        onSuccess()
      }
    } catch {
      setRegError('네트워크 오류가 발생했습니다.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    /* 백드롭 */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* 모달 패널 */}
      <div className="w-full max-w-md rounded-t-2xl bg-popup-white shadow-2xl sm:rounded-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-popup-border px-5 py-4">
          <h2 className="text-sm font-bold text-popup-text">내 Popup 페이지 등록하기</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-popup-muted hover:bg-popup-bg hover:text-popup-text"
            aria-label="닫기"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-5">
          {regSuccess ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-popup-accent-bg text-popup-accent">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-popup-text">등록 완료!</p>
                <p className="mt-1 text-xs text-popup-muted">검색 디렉토리에 페이지가 등록되었어요.</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg bg-popup-accent px-5 py-2 text-sm font-medium text-white hover:bg-popup-accent-hover"
              >
                확인
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-popup-muted">
                Popup URL과 PIN을 입력하면 검색 디렉토리에 등록됩니다.
                이미 등록된 경우 제목·설명을 업데이트합니다.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-popup-text">Popup URL</label>
                  <input
                    ref={firstInputRef}
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
                  <div className="mb-1 flex items-center gap-2">
                    <label className="text-xs font-medium text-popup-text">
                      제목 <span className="text-red-400">*</span>
                    </label>
                    {titleFetching && (
                      <span className="text-[10px] text-popup-muted">불러오는 중…</span>
                    )}
                    {!titleFetching && titleAutoFilled && regTitle && (
                      <span className="rounded bg-popup-accent-bg px-1.5 py-0.5 text-[10px] font-medium text-popup-accent">자동완성</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={titleFetching ? '제목을 불러오는 중…' : '검색 결과에 표시될 제목'}
                    value={regTitle}
                    onChange={(e) => { setRegTitle(e.target.value); setTitleAutoFilled(false) }}
                    maxLength={80}
                    className="w-full rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-popup-text">
                    설명 <span className="text-popup-faint">(선택)</span>
                  </label>
                  <textarea
                    placeholder="페이지를 한 줄로 소개해주세요"
                    value={regDesc}
                    onChange={(e) => setRegDesc(e.target.value)}
                    rows={2}
                    maxLength={200}
                    className="w-full resize-none rounded-lg border border-popup-border bg-popup-bg px-3 py-2 text-sm text-popup-text outline-none focus:border-popup-accent"
                  />
                </div>

                {regError && <p className="text-xs text-red-500">{regError}</p>}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-popup-accent-hover disabled:opacity-40"
                >
                  {regLoading ? '등록 중…' : '등록하기'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 검색 페이지 ─────────────────────────────────────────── */
export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
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
        <button
          onClick={() => setRegisterOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-popup-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-popup-accent-hover"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 1v10M1 6h10" />
          </svg>
          내 페이지 등록
        </button>
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
          <div className="py-12 text-center">
            <p className="text-sm text-popup-muted">
              {query ? '검색 결과가 없어요.' : '아직 등록된 페이지가 없어요.'}
            </p>
            {!query && (
              <button
                onClick={() => setRegisterOpen(true)}
                className="mt-3 text-xs font-medium text-popup-accent underline underline-offset-2 hover:opacity-80"
              >
                첫 번째로 등록해 보세요 →
              </button>
            )}
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

      {/* ── 등록 모달 ── */}
      {registerOpen && (
        <RegisterModal
          onClose={() => setRegisterOpen(false)}
          onSuccess={() => fetchResults(query)}
          query={query}
        />
      )}
    </div>
  )
}
