'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function SuccessInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId    = searchParams.get('orderId')
    const amount     = searchParams.get('amount')
    const slug       = searchParams.get('slug')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setMessage('결제 정보가 없습니다.')
      return
    }

    fetch(`/api/payments/confirm?paymentKey=${paymentKey}&orderId=${orderId}&amount=${amount}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setStatus('ok')
          setTimeout(() => router.push(slug ? `/${slug}/edit` : '/'), 2000)
        } else {
          setStatus('error')
          setMessage(data.error ?? '결제 처리에 실패했습니다.')
        }
      })
      .catch(() => { setStatus('error'); setMessage('네트워크 오류가 발생했습니다.') })
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-popup-white">
      <div className="text-center">
        {status === 'loading' && <p className="text-popup-muted">결제를 처리하는 중...</p>}
        {status === 'ok' && (
          <>
            <div className="mb-4 text-5xl">🌿</div>
            <h1 className="mb-2 text-xl font-bold text-popup-text">결제 완료!</h1>
            <p className="text-sm text-popup-muted">잠시 후 에디터로 이동합니다...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="mb-2 text-xl font-bold text-popup-text">결제 실패</h1>
            <p className="mb-4 text-sm text-popup-muted">{message}</p>
            <a href="/" className="text-sm text-popup-accent underline">홈으로</a>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return <Suspense><SuccessInner /></Suspense>
}
