'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface Page { slug: string; title: string; expires_at: string }

export default function MyPagesPage() {
  const [email, setEmail] = useState('')
  const [pages, setPages] = useState<Page[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
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
      setLoading(false)
    }
  }

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="min-h-screen bg-popup-bg">
      <nav className="flex h-12 items-center border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-bold text-popup-text">
          Popup
        </Link>
      </nav>

      <div className="mx-auto max-w-[480px] px-6 py-16">
        <h1 className="mb-2 text-2xl font-bold text-popup-text">내 페이지</h1>
        <p className="mb-8 text-sm text-popup-muted">결제 시 입력한 이메일로 페이지를 찾을 수 있어요.</p>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            required
            className="flex-1 rounded-lg border border-popup-border bg-popup-white px-3 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="rounded-lg bg-popup-accent px-4 py-2.5 text-sm font-medium text-popup-accent-fg transition-colors hover:bg-popup-accent-hover disabled:opacity-40"
          >
            {loading ? '검색 중...' : '찾기'}
          </button>
        </form>

        {error && <p className="mb-6 text-sm text-red-500">{error}</p>}

        {pages !== null && (
          pages.length === 0 ? (
            <div className="rounded-xl border border-popup-border bg-popup-white py-12 text-center">
              <p className="text-sm text-popup-muted">해당 이메일로 등록된 페이지가 없습니다.</p>
            </div>
          ) : (
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
          )
        )}
      </div>
    </div>
  )
}
