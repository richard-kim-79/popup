'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function FailInner() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const message = searchParams.get('message') ?? '결제가 취소되었거나 실패했습니다.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-popup-white">
      <div className="text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold text-popup-text">결제 실패</h1>
        <p className="mb-6 text-sm text-popup-muted">{message}</p>
        <div className="flex justify-center gap-3">
          {slug && (
            <a href={`/${slug}/edit`} className="rounded-md bg-popup-accent px-5 py-2 text-sm font-medium text-white hover:bg-popup-accent-hover">
              에디터로 돌아가기
            </a>
          )}
          <a href="/" className="rounded-md border border-popup-border px-5 py-2 text-sm text-popup-text hover:bg-popup-bg">
            홈으로
          </a>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return <Suspense><FailInner /></Suspense>
}
