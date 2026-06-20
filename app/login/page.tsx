'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase'

function LoginInner() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // URL의 ?error= 파라미터 → 에러 메시지로 표시
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setError(decodeURIComponent(err))
  }, [searchParams])

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const supabase = getSupabaseBrowser()
    // PKCE 검증자 쿠키는 "현재 브라우저 origin"에 기록되므로, 콜백도 반드시 같은 origin으로
    // 돌아와야 한다. NEXT_PUBLIC_BASE_URL(정식 도메인)이 현재 호스트와 다르면(apex↔www,
    // vercel.app 등) 쿠키가 콜백 요청에 실리지 않아 "PKCE code verifier not found"가 발생.
    const baseUrl = window.location.origin.replace(/\/$/, '')
    // 로그인 후 복귀 경로 — 동일 오리진 경로만 허용(open-redirect 방지). 기본 /my-pages
    const rawNext = searchParams.get('next')
    const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/my-pages'
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (e) {
      setError(e.message)
      setLoading(false)
    }
    // 성공 시 Google로 리다이렉트되므로 setLoading 호출 불필요
  }

  return (
    <div className="min-h-screen bg-popup-bg">
      <nav className="flex h-12 items-center border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-bold text-popup-text">
          Popup
        </Link>
      </nav>

      <div className="mx-auto flex max-w-[400px] flex-col items-center px-6 py-24">
        <h1 className="mb-2 text-2xl font-bold text-popup-text">로그인</h1>
        <p className="mb-10 text-center text-sm text-popup-muted">
          로그인하면 내가 만든 페이지를<br />한 곳에서 관리할 수 있어요.
        </p>

        <button
          onClick={() => void handleGoogle()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-popup-border bg-popup-white py-3 text-sm font-medium text-popup-text transition-colors hover:border-popup-text disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? '이동 중…' : 'Google로 계속하기'}
        </button>

        {error && (
          <p className="mt-4 text-center text-xs text-red-400">{error}</p>
        )}

        <p className="mt-10 text-center text-xs text-popup-faint">
          로그인 없이도 페이지를 만들 수 있어요.<br />
          <Link href="/" className="underline-offset-2 hover:underline">홈으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-popup-muted">불러오는 중…</div>}>
      <LoginInner />
    </Suspense>
  )
}
