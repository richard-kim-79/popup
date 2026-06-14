'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'
import PreviewCard from '@/components/MyPages/PreviewCard'

interface Page {
  slug: string
  title: string
  expires_at: string
  created_at?: string
  is_html?: boolean
  locked?: boolean
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

  // 탭
  const [tab, setTab] = useState<TabKey>('active')

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

  // 페이지 등록 모달
  const [showRegister, setShowRegister] = useState(false)
  const [regUrl, setRegUrl] = useState('')
  const [regPin, setRegPin] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')

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

  // ── 페이지 등록 (PIN으로 인증) ───────────────────────────────
  const [regLockedSlug, setRegLockedSlug] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (regLoading) return
    setRegLoading(true)
    setRegError('')
    setRegSuccess('')
    setRegLockedSlug(null)
    try {
      const res = await fetch('/api/auth/register-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugOrUrl: regUrl, pin: regPin }),
      })
      const data = await res.json() as {
        ok?: boolean
        slug?: string
        title?: string
        locked?: boolean
        error?: string
      }
      if (!res.ok || !data.ok) {
        setRegError(data.error ?? '등록에 실패했습니다.')
        setRegLoading(false)
        return
      }
      setRegSuccess(`"${data.title}" 페이지가 등록됐어요.`)
      setRegUrl('')
      setRegPin('')
      await loadMine()
      if (data.locked) {
        // 잠긴 페이지는 사용자에게 안내 시간을 더 주고 자동 닫기 안 함
        setRegLockedSlug(data.slug ?? null)
        setRegLoading(false)
        return
      }
      // 일반 페이지: 1.5초 후 모달 자동 닫기
      setTimeout(() => {
        setShowRegister(false)
        setRegSuccess('')
      }, 1500)
    } catch {
      setRegError('네트워크 오류가 발생했습니다.')
    } finally {
      setRegLoading(false)
    }
  }

  const closeRegister = () => {
    if (regLoading) return
    setShowRegister(false)
    setRegError('')
    setRegSuccess('')
    setRegUrl('')
    setRegPin('')
    setRegLockedSlug(null)
  }

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

      <div className="mx-auto max-w-[480px] px-6 py-16">
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
                  onClick={() => setShowRegister(true)}
                  className="rounded-lg border border-popup-border bg-popup-white px-3 py-2 text-xs font-medium text-popup-text hover:border-popup-text transition-colors"
                >
                  + 페이지 등록
                </button>
              </div>
            </div>

            {claimed !== null && claimed > 0 && (
              <div className="mb-4 rounded-lg border border-popup-accent/30 bg-popup-accent-bg px-3 py-2.5 text-center text-xs text-popup-accent">
                이 브라우저에 저장된 {claimed}개 페이지를 계정에 연결했어요.
              </div>
            )}

            {/* ── 탭 ───────────────────────────────────────────── */}
            {pages && pages.length > 0 && (
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
                  <button
                    onClick={() => setShowRegister(true)}
                    className="text-xs text-popup-muted underline-offset-2 hover:text-popup-text hover:underline"
                  >
                    또는 기존 페이지를 PIN으로 등록하기
                  </button>
                </div>
              </div>
            )}

            {/* ── 탭은 있는데 해당 탭만 비어있음 ─────────────── */}
            {pages && pages.length > 0 && sortedPages && sortedPages.length === 0 && (
              <div className="rounded-xl border border-popup-border bg-popup-white py-12 text-center">
                <p className="text-sm text-popup-muted">
                  {tab === 'active' ? '활성 상태인 페이지가 없어요.' : '만료된 페이지가 없어요.'}
                </p>
              </div>
            )}

            {sortedPages && sortedPages.length > 0 && (
              <div className="flex flex-col gap-3">
                {sortedPages.map((p) => {
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
                        <p className="mt-0.5 text-xs text-popup-faint">
                          {left > 0 ? `${left}일 남음` : '만료됨'}
                        </p>
                      </div>
                      {/* 우측 액션 — <a> 안에 또 다른 <a>(Link)를 두면 nested anchor가 되어 HTML 사양 위반.
                          버튼으로 만들고 stopPropagation + preventDefault + router.push로 분기 */}
                      <div className="ml-4 flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            router.push(isLocked ? `/extend?slug=${p.slug}` : `/${p.slug}/edit`)
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

      {/* ── 페이지 등록 모달 ─────────────────────────────────── */}
      {showRegister && (
        <div
          onClick={closeRegister}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-2xl bg-popup-white p-6 shadow-xl"
          >
            <p className="mb-1 text-sm font-semibold text-popup-text">기존 페이지 등록</p>
            <p className="mb-5 text-xs text-popup-muted">
              내가 만든 페이지의 주소와 PIN을 입력하면 내 계정에 연결돼요.
            </p>

            <form onSubmit={(e) => void handleRegister(e)}>
              <label className="mb-1.5 block text-xs font-medium text-popup-muted">페이지 주소</label>
              <input
                type="text"
                value={regUrl}
                onChange={(e) => setRegUrl(e.target.value)}
                placeholder="popup2026.com/abc123 또는 abc123"
                disabled={regLoading}
                className="mb-3 w-full rounded-lg border border-popup-border bg-popup-white px-3.5 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent disabled:opacity-50"
                autoFocus
              />

              <label className="mb-1.5 block text-xs font-medium text-popup-muted">편집 PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={regPin}
                onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4~8자리 숫자"
                maxLength={8}
                disabled={regLoading}
                className="mb-4 w-full rounded-lg border border-popup-border bg-popup-white px-3.5 py-2.5 text-sm tracking-[0.25em] text-popup-text outline-none transition-colors focus:border-popup-accent disabled:opacity-50"
              />

              {regError && (
                <p className="mb-3 text-xs text-red-400">{regError}</p>
              )}
              {regSuccess && !regLockedSlug && (
                <p className="mb-3 text-xs text-popup-accent">✓ {regSuccess}</p>
              )}
              {regSuccess && regLockedSlug && (
                <div className="mb-3 rounded-lg border border-popup-warn-border bg-popup-warn-bg px-3 py-2.5 text-xs">
                  <p className="text-popup-accent font-medium mb-1">✓ {regSuccess}</p>
                  <p className="text-popup-warn">🔒 잠금 상태 — 편집하려면 연장이 필요해요.</p>
                  <Link
                    href={`/extend?slug=${regLockedSlug}`}
                    className="mt-2 inline-block rounded-md bg-popup-accent px-3 py-1.5 text-xs font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
                  >
                    지금 연장하기 →
                  </Link>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeRegister}
                  disabled={regLoading}
                  className="flex-1 rounded-lg border border-popup-border bg-popup-white py-2.5 text-sm text-popup-muted hover:border-popup-text hover:text-popup-text transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={regLoading || !regUrl.trim() || regPin.length < 4}
                  className="flex-1 rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover transition-colors disabled:opacity-50"
                >
                  {regLoading ? '확인 중…' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
