'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase'

interface Page {
  slug: string
  title: string
  expires_at: string
  is_html?: boolean
}

interface SessionUser {
  email: string | null
  name: string | null
  avatar: string | null
}

export default function MyPagesPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [pages, setPages] = useState<Page[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimed, setClaimed] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')

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
            <div className="mb-8 flex items-center gap-3">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-popup-text">{user.name ?? '내 페이지'}</p>
                <p className="text-xs text-popup-muted">{user.email}</p>
              </div>
            </div>

            {claimed !== null && claimed > 0 && (
              <div className="mb-4 rounded-lg border border-popup-accent/30 bg-popup-accent-bg px-3 py-2.5 text-center text-xs text-popup-accent">
                이 브라우저에 저장된 {claimed}개 페이지를 계정에 연결했어요.
              </div>
            )}

            {pages && pages.length === 0 && (
              <div className="rounded-xl border border-popup-border bg-popup-white py-12 text-center">
                <p className="mb-3 text-sm text-popup-muted">아직 내 페이지가 없어요.</p>
                <Link
                  href="/"
                  className="text-sm text-popup-accent underline-offset-2 hover:underline"
                >
                  새 팝업 만들기 →
                </Link>
              </div>
            )}

            {pages && pages.length > 0 && (
              <div className="flex flex-col gap-3">
                {pages.map((p) => {
                  const left = daysLeft(p.expires_at)
                  return (
                    <div key={p.slug} className="flex items-center justify-between rounded-xl border border-popup-border bg-popup-white px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-popup-text">{p.title}</p>
                          {p.is_html && (
                            <span className="rounded bg-popup-surface px-1.5 py-0.5 text-[10px] text-popup-muted">HTML</span>
                          )}
                        </div>
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
    </div>
  )
}
