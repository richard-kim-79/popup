'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'
import PreviewCard from '@/components/MyPages/PreviewCard'
import ExpireNowModal from '@/components/Modal/ExpireNowModal'
import ExtendLifespanModal from '@/components/Modal/ExtendLifespanModal'
import SubscriptionStatus from '@/components/MyPages/SubscriptionStatus'
import UsageCard from '@/components/MyPages/UsageCard'
import McpConnect from '@/components/MyPages/McpConnect'

interface Page {
  slug: string
  title: string
  expires_at: string
  created_at?: string
  is_html?: boolean
  locked?: boolean
  listed?: boolean
  searchText?: string
}

type SortKey = 'recent' | 'expiring' | 'title' | 'locked-first'

const SORT_LABELS: Record<SortKey, string> = {
  recent: '최신순',
  expiring: '만료 임박순',
  title: '제목순',
  'locked-first': '잠금 먼저',
}

type TabKey = 'active' | 'expired'
const TAB_LABELS: Record<TabKey, string> = {
  active: '활성',
  expired: '만료',
}

const SORT_STORAGE_KEY = 'popup_my_pages_sort'
const TAB_STORAGE_KEY = 'popup_my_pages_tab'
const HOVER_DELAY_MS = 300

function isPageActive(p: Page): boolean {
  if (p.locked) return false
  const diff = new Date(p.expires_at).getTime() - Date.now()
  return diff > 0
}

interface SessionUser {
  email: string | null
  name: string | null
  avatar: string | null
}

export default function MyPagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [pages, setPages] = useState<Page[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimed, setClaimed] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')

  // 정렬
  const [sortKey, setSortKey] = useState<SortKey>('recent')

  // 문서 검색어 (제목 + 본문)
  const [query, setQuery] = useState('')
  // 서버 검색(내 페이지 PGroonga, 비공개 포함) 결과 — 검색어 있을 때 사용
  const [searchHits, setSearchHits] = useState<Array<{ slug: string; snippet: string | null; score: number }> | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 탭
  const [tab, setTab] = useState<TabKey>('active')

  // "지금 만료" 모달 — 어떤 slug에 대해 띄울지
  const [expireSlug, setExpireSlug] = useState<string | null>(null)

  // "수명 연장" 모달 — 유료 구독자 전용
  const [extendSlug, setExtendSlug] = useState<string | null>(null)

  // 현재 사용자 티어 — 유료(lite/pro) 여부로 수명 연장 노출 결정
  const [isPaid, setIsPaid] = useState(false)

  // 구독·저장용량 패널(햄버거 메뉴) 펼침 여부
  const [infoOpen, setInfoOpen] = useState(false)

  // 카드 수명 관리(시계 아이콘) 메뉴 — 어떤 slug의 메뉴를 열지
  const [actionSlug, setActionSlug] = useState<string | null>(null)

  // 호버 미리보기
  const [hoverPreview, setHoverPreview] = useState<{
    slug: string
    title: string
    daysLeft: number
    locked: boolean
    anchor: { top: number; left: number; right: number; bottom: number }
  } | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supportsHoverRef = useRef<boolean>(true)

  // ── 로컬 토큰으로 페이지 클레임 ───────────────────────────────
  const claimLocalPages = useCallback(async () => {
    const items: { slug: string; token: string }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('popup_token_')) continue
      const slug = key.slice('popup_token_'.length)
      const token = localStorage.getItem(key)
      if (slug && token) items.push({ slug, token })
    }
    if (items.length === 0) return
    try {
      const res = await fetch('/api/auth/claim-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json() as { ok?: boolean; claimed?: string[] }
      if (data.ok && data.claimed && data.claimed.length > 0) {
        setClaimed(data.claimed.length)
      }
    } catch {
      // 무시
    }
  }, [])

  // ── 내 페이지 로드 (로그인된 경우) ────────────────────────────
  const loadMine = useCallback(async () => {
    const res = await fetch('/api/my-pages/mine')
    if (!res.ok) return
    const data = await res.json() as { pages?: Page[] }
    if (data.pages) setPages(data.pages)
  }, [])

  // ── 세션 체크 ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowser()
    void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? null,
          name: (data.user.user_metadata?.name as string | undefined) ?? null,
          avatar: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
        })
        await claimLocalPages()
        await loadMine()
        // 티어 조회 — 유료 구독자에게만 수명 연장 노출
        try {
          const r = await fetch('/api/subscriptions/usage')
          const u = await r.json() as { tier?: string }
          setIsPaid(u.tier === 'lite' || u.tier === 'pro')
        } catch {
          // 무시 — 기본 false
        }
      }
      setLoading(false)
    })
  }, [claimLocalPages, loadMine])

  // ── 이메일 검색 (비로그인 fallback) ───────────────────────────
  const handleEmailSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSearchLoading(true)
    setError('')
    setPages(null)
    try {
      const res = await fetch(`/api/my-pages?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json() as { pages?: Page[]; error?: string }
      if (data.pages) setPages(data.pages)
      else setError(data.error ?? '오류가 발생했습니다.')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSearchLoading(false)
    }
  }

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // ── 검색 갤러리 노출 on/off (옵트아웃) — 낙관적 업데이트 ──────
  const toggleListing = async (slug: string, next: boolean) => {
    setPages((prev) => prev ? prev.map((p) => (p.slug === slug ? { ...p, listed: next } : p)) : prev)
    try {
      const res = await fetch(`/api/pages/${slug}/listing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listed: next }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      // 실패 시 롤백
      setPages((prev) => prev ? prev.map((p) => (p.slug === slug ? { ...p, listed: !next } : p)) : prev)
    }
  }

  // ── 정렬·탭: localStorage 복원 ────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedSort = localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null
    if (storedSort && storedSort in SORT_LABELS) setSortKey(storedSort)
    const storedTab = localStorage.getItem(TAB_STORAGE_KEY) as TabKey | null
    if (storedTab && storedTab in TAB_LABELS) setTab(storedTab)
    // 터치 디바이스 감지
    supportsHoverRef.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  }, [])

  const handleSortChange = (next: SortKey) => {
    setSortKey(next)
    if (typeof window !== 'undefined') localStorage.setItem(SORT_STORAGE_KEY, next)
  }

  const handleTabChange = (next: TabKey) => {
    setTab(next)
    if (typeof window !== 'undefined') localStorage.setItem(TAB_STORAGE_KEY, next)
  }

  // 탭별 카운트
  const tabCounts = useMemo(() => {
    if (!pages) return { active: 0, expired: 0 }
    return pages.reduce(
      (acc, p) => {
        if (isPageActive(p)) acc.active++
        else acc.expired++
        return acc
      },
      { active: 0, expired: 0 },
    )
  }, [pages])

  // ── 정렬 + 탭 필터 적용 (메모이즈) ───────────────────────────
  const sortedPages = useMemo(() => {
    if (!pages) return null
    // 탭 필터: 활성/만료
    const filtered = pages.filter((p) => (tab === 'active' ? isPageActive(p) : !isPageActive(p)))
    const arr = [...filtered]
    switch (sortKey) {
      case 'recent':
        return arr.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      case 'expiring':
        return arr.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
      case 'title':
        return arr.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
      case 'locked-first':
        return arr.sort((a, b) => {
          const aLocked = !!a.locked || daysLeft(a.expires_at) <= 0
          const bLocked = !!b.locked || daysLeft(b.expires_at) <= 0
          if (aLocked !== bLocked) return aLocked ? -1 : 1
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        })
    }
  }, [pages, sortKey, tab])

  const searchActive = query.trim().length > 0

  // ── 검색어 입력 시 서버 검색(디바운스) — 내 모든 페이지(비공개 포함) ──
  useEffect(() => {
    const q = query.trim()
    if (!q) { setSearchHits(null); return }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/my-pages/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const j = await res.json() as { results: Array<{ slug: string; snippet: string | null; score: number }> }
          setSearchHits(j.results ?? [])
        }
      } catch { setSearchHits([]) }
    }, 250)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [query])

  // 표시 목록: 검색 중이면 서버 결과(관련도순·스니펫), 아니면 탭/정렬 목록
  type DisplayPage = Page & { snippet?: string | null }
  const displayList = useMemo<DisplayPage[] | null>(() => {
    if (!pages) return null
    if (searchActive) {
      if (!searchHits) return null
      const bySlug = new Map(pages.map((p) => [p.slug, p]))
      return searchHits.flatMap((h) => {
        const p = bySlug.get(h.slug)
        return p ? [{ ...p, snippet: h.snippet }] : []
      })
    }
    return sortedPages ?? null
  }, [pages, searchActive, searchHits, sortedPages])

  // ── 호버 미리보기 핸들러 ─────────────────────────────────────
  const handleHoverEnter = (e: React.MouseEvent<HTMLElement>, p: Page) => {
    if (!supportsHoverRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const anchor = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom }
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setHoverPreview({
        slug: p.slug,
        title: p.title,
        daysLeft: daysLeft(p.expires_at),
        locked: !!p.locked || daysLeft(p.expires_at) <= 0,
        anchor,
      })
    }, HOVER_DELAY_MS)
  }
  const handleHoverLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoverPreview(null)
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-popup-bg text-sm text-popup-muted">
        불러오는 중…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-popup-bg">
      <nav className="flex h-12 items-center justify-between border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-bold text-popup-text">Popup</Link>
        {user && (
          <button
            onClick={() => void handleSignOut()}
            className="text-xs text-popup-muted hover:text-popup-text transition-colors"
          >
            로그아웃
          </button>
        )}
      </nav>

      <div className="mx-auto max-w-[640px] px-4 py-16 sm:px-6">
        {/* ── 로그인된 사용자 ─────────────────────────────────── */}
        {user ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {user.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-popup-text">{user.name ?? '내 페이지'}</p>
                  <p className="truncate text-xs text-popup-muted">{user.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pages && pages.length > 1 && (
                  <select
                    value={sortKey}
                    onChange={(e) => handleSortChange(e.target.value as SortKey)}
                    aria-label="정렬 기준"
                    title="정렬"
                    className="rounded-lg border border-popup-border bg-popup-white px-2.5 py-2 text-xs text-popup-text hover:border-popup-text transition-colors focus:outline-none focus:border-popup-accent"
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                      <option key={k} value={k}>{SORT_LABELS[k]}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setInfoOpen((v) => !v)}
                  aria-label="구독·저장용량 메뉴"
                  aria-expanded={infoOpen}
                  title="구독·저장용량"
                  className={`rounded-lg border px-2.5 py-2 transition-colors ${
                    infoOpen
                      ? 'border-popup-text bg-popup-surface text-popup-text'
                      : 'border-popup-border bg-popup-white text-popup-muted hover:border-popup-text hover:text-popup-text'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {claimed !== null && claimed > 0 && (
              <div className="mb-4 rounded-lg border border-popup-accent/30 bg-popup-accent-bg px-3 py-2.5 text-center text-xs text-popup-accent">
                이 브라우저에 저장된 {claimed}개 페이지를 계정에 연결했어요.
              </div>
            )}

            {/* ── 구독 상태 + 저장 용량 (햄버거 메뉴로 접힘) ───── */}
            {infoOpen && (
              <div className="mb-2">
                <SubscriptionStatus />
                <UsageCard />
                <McpConnect />
              </div>
            )}

            {/* ── 문서 검색 ────────────────────────────────────── */}
            {pages && pages.length > 0 && (
              <div className="relative mb-3">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-popup-muted">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="제목·내용으로 내 페이지 검색…"
                  aria-label="내 페이지 검색"
                  className="w-full rounded-lg border border-popup-border bg-popup-white py-2.5 pl-9 pr-3 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
                />
              </div>
            )}

            {/* ── 검색 결과 헤더 ─────────────────────────────────── */}
            {searchActive && (
              <>
                <style>{`.keyword{color:#2A6049;font-weight:600;background:#EDF5F1;border-radius:2px;padding:0 1px}`}</style>
                <p className="mb-3 text-xs text-popup-muted">
                  {displayList ? `검색 결과 ${displayList.length}건 · 내 모든 페이지` : '검색 중…'}
                </p>
              </>
            )}

            {/* ── 탭 ───────────────────────────────────────────── */}
            {pages && pages.length > 0 && !searchActive && (
              <div role="tablist" aria-label="페이지 상태" className="mb-4 flex items-center gap-1 border-b border-popup-border">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => {
                  const active = tab === k
                  const count = tabCounts[k]
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleTabChange(k)}
                      className={`relative px-4 py-2.5 text-sm transition-colors ${
                        active
                          ? 'font-semibold text-popup-text after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-popup-accent'
                          : 'text-popup-muted hover:text-popup-text'
                      }`}
                    >
                      {TAB_LABELS[k]}
                      <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] ${active ? 'bg-popup-accent-bg text-popup-accent' : 'bg-popup-surface text-popup-muted'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── 전체 비어있음 ───────────────────────────────── */}
            {pages && pages.length === 0 && (
              <div className="rounded-xl border border-popup-border bg-popup-white py-12 text-center">
                <p className="mb-3 text-sm text-popup-muted">아직 내 페이지가 없어요.</p>
                <div className="flex flex-col items-center gap-2">
                  <Link
                    href="/"
                    className="text-sm text-popup-accent underline-offset-2 hover:underline"
                  >
                    새 팝업 만들기 →
                  </Link>
                </div>
              </div>
            )}

            {/* ── 탭은 있는데 해당 탭만 비어있음 ─────────────── */}
            {pages && pages.length > 0 && displayList && displayList.length === 0 && (
              <div className="rounded-xl border border-popup-border bg-popup-white py-12 text-center">
                <p className="text-sm text-popup-muted">
                  {query.trim()
                    ? `'${query.trim()}'에 대한 검색 결과가 없어요.`
                    : tab === 'active' ? '활성 상태인 페이지가 없어요.' : '만료된 페이지가 없어요.'}
                </p>
              </div>
            )}

            {displayList && displayList.length > 0 && (
              <div className="flex flex-col gap-3">
                {displayList.map((p) => {
                  const left = daysLeft(p.expires_at)
                  const isLocked = !!p.locked || left <= 0
                  return (
                    <a
                      key={p.slug}
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseEnter={(e) => handleHoverEnter(e, p)}
                      onMouseLeave={handleHoverLeave}
                      aria-label={`${p.title} 페이지 새 창에서 보기`}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-popup-border bg-popup-white px-5 py-4 transition-colors hover:border-popup-accent/40 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-popup-text group-hover:text-popup-accent transition-colors">{p.title}</p>
                          {p.is_html && (
                            <span className="rounded bg-popup-surface px-1.5 py-0.5 text-[10px] text-popup-muted">HTML</span>
                          )}
                          {isLocked && (
                            <span className="rounded bg-popup-warn-bg border border-popup-warn-border px-1.5 py-0.5 text-[10px] font-medium text-popup-warn">
                              🔒 잠김
                            </span>
                          )}
                        </div>
                        {p.snippet && (
                          <p
                            className="mt-1 line-clamp-2 text-xs leading-relaxed text-popup-muted"
                            dangerouslySetInnerHTML={{ __html: p.snippet }}
                          />
                        )}
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-popup-faint">
                          <span>{left > 0 ? `${left}일 남음` : '만료됨'}</span>
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                void toggleListing(p.slug, !p.listed)
                              }}
                              title={p.listed ? '검색 갤러리에 공개 중 — 눌러서 숨기기' : '검색 갤러리에서 숨김 — 눌러서 공개'}
                              aria-label={`${p.title} 갤러리 ${p.listed ? '숨기기' : '공개'}`}
                              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                                p.listed
                                  ? 'bg-popup-accent-bg text-popup-accent'
                                  : 'text-popup-faint hover:text-popup-muted'
                              }`}
                            >
                              {p.listed ? '갤러리 공개중' : '갤러리 숨김'}
                            </button>
                          )}
                        </div>
                      </div>
                      {/* 우측 액션 — <a> 안에 또 다른 <a>(Link)를 두면 nested anchor가 되어 HTML 사양 위반.
                          버튼으로 만들고 stopPropagation + preventDefault + router.push로 분기 */}
                      <div className="ml-4 flex shrink-0 items-center gap-1.5">
                        {!isLocked && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                // 유료: 연장·만료 메뉴 토글 / 무료: 만료만 있으므로 바로 실행
                                if (isPaid) {
                                  setActionSlug((cur) => (cur === p.slug ? null : p.slug))
                                } else {
                                  setExpireSlug(p.slug)
                                }
                              }}
                              title={isPaid ? '수명 연장 · 지금 만료' : '지금 만료시키기'}
                              aria-label={`${p.title} 수명 관리`}
                              aria-haspopup={isPaid ? 'menu' : undefined}
                              aria-expanded={isPaid ? actionSlug === p.slug : undefined}
                              className={`rounded-md p-1.5 transition-colors ${
                                actionSlug === p.slug
                                  ? 'bg-popup-surface text-popup-text'
                                  : 'text-popup-muted hover:bg-popup-surface hover:text-popup-text'
                              }`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                              </svg>
                            </button>

                            {isPaid && actionSlug === p.slug && (
                              <>
                                {/* 바깥 클릭 닫기 */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setActionSlug(null)
                                  }}
                                  className="fixed inset-0 z-[300]"
                                />
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full z-[310] mt-1 w-36 overflow-hidden rounded-lg border border-popup-border bg-popup-white py-1 shadow-lg"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      setActionSlug(null)
                                      setExtendSlug(p.slug)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-popup-text hover:bg-popup-accent-bg transition-colors"
                                  >
                                    <span>🌱</span> 수명 연장
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      setActionSlug(null)
                                      setExpireSlug(p.slug)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-popup-warn hover:bg-popup-warn-bg transition-colors"
                                  >
                                    <span>⏱</span> 지금 만료
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (isLocked && isPaid) {
                              // 유료 구독자: 결제 없이 바로 연장 모달
                              setExtendSlug(p.slug)
                            } else {
                              router.push(isLocked ? `/extend?slug=${p.slug}` : `/${p.slug}/edit`)
                            }
                          }}
                          className="rounded-md bg-popup-accent px-3 py-1.5 text-xs font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
                        >
                          {isLocked ? '연장하기' : '편집'}
                        </button>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── 비로그인: 로그인 권장 + 이메일 검색 fallback ──── */}
            <h1 className="mb-2 text-2xl font-bold text-popup-text">내 페이지</h1>
            <p className="mb-6 text-sm text-popup-muted">
              로그인하면 내가 만든 페이지를 한 곳에서 관리할 수 있어요.
            </p>

            <Link
              href="/login"
              className="mb-10 block w-full rounded-xl bg-popup-accent py-3 text-center text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover transition-colors"
            >
              로그인하기 →
            </Link>

            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-popup-border" />
              <span className="text-xs text-popup-faint">또는 이메일로 찾기</span>
              <div className="h-px flex-1 bg-popup-border" />
            </div>

            <form onSubmit={handleEmailSearch} className="mb-8 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="결제 시 입력한 이메일"
                required
                className="flex-1 rounded-lg border border-popup-border bg-popup-white px-3 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
              />
              <button
                type="submit"
                disabled={searchLoading || !email.trim()}
                className="rounded-lg border border-popup-border bg-popup-white px-4 py-2.5 text-sm font-medium text-popup-text transition-colors hover:border-popup-text disabled:opacity-40"
              >
                {searchLoading ? '검색 중...' : '찾기'}
              </button>
            </form>

            {error && <p className="mb-6 text-sm text-red-500">{error}</p>}

            {pages !== null && pages.length === 0 && (
              <div className="rounded-xl border border-popup-border bg-popup-white py-12 text-center">
                <p className="text-sm text-popup-muted">해당 이메일로 등록된 페이지가 없습니다.</p>
              </div>
            )}

            {pages && pages.length > 0 && (
              <div className="flex flex-col gap-3">
                {pages.map((p) => {
                  const left = daysLeft(p.expires_at)
                  return (
                    <div key={p.slug} className="flex items-center justify-between rounded-xl border border-popup-border bg-popup-white px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-popup-text">{p.title}</p>
                        <p className="mt-0.5 text-xs text-popup-faint">
                          {left > 0 ? `${left}일 남음` : '소멸됨'}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 gap-2">
                        <Link href={`/${p.slug}`} className="rounded-md px-3 py-1.5 text-xs text-popup-muted hover:bg-popup-surface">보기</Link>
                        <Link href={`/${p.slug}/edit`} className="rounded-md bg-popup-accent px-3 py-1.5 text-xs font-medium text-popup-accent-fg hover:bg-popup-accent-hover">편집</Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 호버 미리보기 카드 ──────────────────────────────── */}
      {hoverPreview && (
        <PreviewCard
          key={hoverPreview.slug}
          slug={hoverPreview.slug}
          title={hoverPreview.title}
          daysLeft={hoverPreview.daysLeft}
          locked={hoverPreview.locked}
          anchor={hoverPreview.anchor}
        />
      )}

      {/* ── 지금 만료 모달 ───────────────────────────────────── */}
      {expireSlug && (
        <ExpireNowModal
          slug={expireSlug}
          editToken={typeof window !== 'undefined' ? localStorage.getItem(`popup_token_${expireSlug}`) : null}
          onClose={() => setExpireSlug(null)}
          onExpired={() => {
            setExpireSlug(null)
            void loadMine()  // 카드를 활성 탭에서 만료 탭으로 즉시 반영
          }}
        />
      )}

      {/* ── 수명 연장 모달 (유료 구독자) ──────────────────────── */}
      {extendSlug && (
        <ExtendLifespanModal
          slug={extendSlug}
          editToken={typeof window !== 'undefined' ? localStorage.getItem(`popup_token_${extendSlug}`) : null}
          onClose={() => setExtendSlug(null)}
          onExtended={() => {
            setExtendSlug(null)
            void loadMine()  // 연장된 만료일 / 잠금 해제 즉시 반영
          }}
        />
      )}

    </div>
  )
}
