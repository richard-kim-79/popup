'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.replace('/admin')
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? '인증에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-popup-bg">
      <div className="w-full max-w-sm rounded-2xl border border-popup-border bg-popup-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl">🌿</span>
          <h1 className="mt-2 text-lg font-bold text-popup-text">관리자 로그인</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-popup-border bg-popup-surface px-3 py-2.5 text-sm text-popup-text outline-none focus:border-popup-accent"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-40"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
