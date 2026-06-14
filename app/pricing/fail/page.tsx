'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function FailInner() {
  const params = useSearchParams()
  const code = params.get('code')
  const message = params.get('message')

  return (
    <div className="flex min-h-screen items-center justify-center bg-popup-bg px-6">
      <div className="w-full max-w-sm rounded-2xl border border-popup-border bg-popup-white px-8 py-10 text-center shadow-sm">
        <div className="mb-3 text-3xl">⚠️</div>
        <p className="mb-2 text-base font-semibold text-popup-text">결제가 취소됐어요</p>
        <p className="mb-5 text-xs text-popup-muted">
          {message ?? '결제가 정상적으로 완료되지 않았어요.'}
          {code && <span className="block mt-1 text-popup-faint">({code})</span>}
        </p>
        <div className="flex flex-col items-center gap-2">
          <Link href="/pricing" className="text-sm text-popup-accent underline-offset-2 hover:underline">
            요금제 다시 보기
          </Link>
          <Link href="/" className="text-xs text-popup-faint hover:text-popup-muted">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PricingFailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-popup-muted">불러오는 중…</div>}>
      <FailInner />
    </Suspense>
  )
}
