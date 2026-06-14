'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'ok' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const authKey = params.get('authKey')
    const customerKey = params.get('customerKey')
    const tier = params.get('tier')
    const cycle = params.get('cycle')

    if (!authKey || !customerKey || !tier || !cycle) {
      setStatus('error')
      setMessage('결제 정보가 없어요.')
      return
    }

    void fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, customerKey, tier, billingCycle: cycle }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.ok) {
          setStatus('ok')
          setTimeout(() => router.push('/my-pages'), 2000)
        } else {
          setStatus('error')
          setMessage((data as { error?: string }).error ?? '구독 등록에 실패했어요.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('네트워크 오류가 발생했어요.')
      })
  }, [params, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-popup-bg px-6">
      <div className="w-full max-w-sm rounded-2xl border border-popup-border bg-popup-white px-8 py-10 text-center shadow-sm">
        {status === 'processing' && (
          <>
            <div className="mb-3 text-3xl">⏳</div>
            <p className="text-sm font-medium text-popup-text">구독 등록 중…</p>
            <p className="mt-1 text-xs text-popup-muted">결제를 처리하고 있어요.</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <div className="mb-3 text-3xl">🎉</div>
            <p className="text-base font-semibold text-popup-text">구독이 시작됐어요!</p>
            <p className="mt-2 text-xs text-popup-muted">잠시 후 내 페이지로 이동합니다…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mb-3 text-3xl">⚠️</div>
            <p className="mb-2 text-base font-semibold text-popup-text">구독 등록 실패</p>
            <p className="mb-5 text-xs text-popup-muted">{message}</p>
            <div className="flex flex-col items-center gap-2">
              <Link href="/pricing" className="text-sm text-popup-accent underline-offset-2 hover:underline">
                다시 시도
              </Link>
              <Link href="/" className="text-xs text-popup-faint hover:text-popup-muted">
                홈으로
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PricingSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-popup-muted">불러오는 중…</div>}>
      <SuccessInner />
    </Suspense>
  )
}
