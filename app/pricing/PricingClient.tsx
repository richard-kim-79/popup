'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TIERS, customerKeyFor, type Tier, type BillingCycle } from '@/lib/tiers'
import { getSupabaseBrowser } from '@/lib/supabase'

// 토스 SDK v2 — `requestBillingAuth`는 자동결제 카드 등록 흐름.
// 전역 `TossPayments`는 layout.tsx의 CDN으로 주입됨. 다른 사용처(extend, UpgradeModal)와의
// type 추론 충돌을 피하기 위해 declare global 없이 unknown으로 받아 호출 직전에 캐스팅.

interface SessionUser {
  id: string
  email: string | null
  name: string | null
}

function formatKRW(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(0)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(0)} MB`
  return `${n} B`
}

export default function PricingClient() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [requesting, setRequesting] = useState<Tier | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
          name: (data.user.user_metadata?.name as string | undefined) ?? null,
        })
      }
      setLoading(false)
    })
  }, [])

  // 토스 SDK CDN 로드 보장 — window.TossPayments는 CDN으로 주입됨
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waitForSdk = async (): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFn = (): any => (window as any).TossPayments
    let fn = getFn()
    if (fn) return fn
    let waited = 0
    while (waited < 5000) {
      await new Promise((r) => setTimeout(r, 200))
      waited += 200
      fn = getFn()
      if (fn) return fn
    }
    throw new Error('결제 SDK 로딩 실패')
  }

  const handleSubscribe = async (tier: Tier) => {
    if (!user) {
      router.push('/login?next=/pricing')
      return
    }
    setError('')
    setRequesting(tier)

    try {
      const TossPayments = await waitForSdk()
      // 자동결제는 별도 MID — NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY 우선
      const clientKey = (
        process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY ??
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ??
        ''
      ).trim()
      const toss = TossPayments(clientKey)

      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin).replace(/\/$/, '')
      const customerKey = customerKeyFor(user.id)

      // 토스 SDK v2 (/v2/standard): payment(customerKey).requestBillingAuth(options) 형태
      // v1의 `tossPayments.requestBillingAuth('CARD', ...)`은 v2에선 동작 안 함.
      const payment = toss.payment({ customerKey })
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${baseUrl}/pricing/success?tier=${tier}&cycle=${cycle}`,
        failUrl: `${baseUrl}/pricing/fail`,
        customerEmail: user.email ?? undefined,
        customerName: user.name ?? undefined,
      })
      // requestBillingAuth는 페이지 이동을 일으키므로 이 아래는 실행되지 않음
    } catch (e) {
      const msg = (e as { message?: string }).message ?? '결제 요청에 실패했어요.'
      setError(msg)
      setRequesting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-popup-muted">
        불러오는 중…
      </div>
    )
  }

  const tiers: Tier[] = ['free', 'lite', 'pro']

  return (
    <div className="mx-auto max-w-[960px] px-6 py-14">
      <div className="mb-2 text-center">
        <h1 className="text-2xl font-bold text-popup-text sm:text-3xl">요금제</h1>
        <p className="mt-2 text-sm text-popup-muted">
          필요한 만큼 저장 용량을 선택하세요
        </p>
      </div>

      {/* 결제 주기 토글 */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-popup-border bg-popup-white p-1">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                cycle === c ? 'bg-popup-accent text-popup-accent-fg' : 'text-popup-muted hover:text-popup-text'
              }`}
            >
              {c === 'monthly' ? '월 결제' : '연 결제'}
              {c === 'yearly' && <span className="ml-1 rounded bg-popup-accent-fg/15 px-1.5 py-0.5 text-[10px]">2개월 무료</span>}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-600">
          {error}
        </div>
      )}

      {/* 티어 카드 */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {tiers.map((tier) => {
          const t = TIERS[tier]
          const isFree = tier === 'free'
          const isPro = tier === 'pro'
          const price = cycle === 'yearly' ? t.priceYearly : t.priceMonthly
          return (
            <div
              key={tier}
              className={`flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md ${
                isPro
                  ? 'border-popup-accent bg-popup-accent-bg'
                  : 'border-popup-border bg-popup-white'
              }`}
            >
              {isPro && (
                <div className="mb-2 self-start rounded-full bg-popup-accent px-2 py-0.5 text-[10px] font-medium text-popup-accent-fg">
                  추천
                </div>
              )}
              <div className="mb-1 text-base font-bold text-popup-text">{t.name}</div>
              <div className="mb-4">
                {isFree ? (
                  <span className="text-2xl font-bold text-popup-text">무료</span>
                ) : (
                  <div>
                    <span className="text-2xl font-bold text-popup-text">{formatKRW(price)}</span>
                    <span className="ml-1 text-xs text-popup-muted">
                      / {cycle === 'yearly' ? '년' : '월'}
                    </span>
                  </div>
                )}
              </div>

              <ul className="mb-6 space-y-2 text-xs text-popup-text">
                <li>💾 저장 용량 {formatBytes(t.storageBytes)}</li>
                <li>📄 페이지 {t.pageLimit === -1 ? '무제한' : `${t.pageLimit}개`}</li>
              </ul>

              {isFree ? (
                <Link
                  href={user ? '/my-pages' : '/login'}
                  className="mt-auto rounded-lg border border-popup-border bg-popup-white py-2.5 text-center text-sm font-medium text-popup-text hover:border-popup-text transition-colors"
                >
                  {user ? '내 페이지' : '무료로 시작'}
                </Link>
              ) : (
                <button
                  onClick={() => void handleSubscribe(tier)}
                  disabled={!!requesting}
                  className={`mt-auto rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    isPro
                      ? 'bg-popup-accent text-popup-accent-fg hover:bg-popup-accent-hover'
                      : 'border border-popup-accent text-popup-accent hover:bg-popup-accent-bg'
                  }`}
                >
                  {requesting === tier
                    ? '결제 진행 중…'
                    : user
                      ? `${t.name} 구독`
                      : '로그인 후 구독'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-10 text-center text-[11px] text-popup-faint">
        토스페이먼츠 자동결제 · 언제든 해지 가능 · 한국 정기결제법 7일 청약철회 보장
      </div>
    </div>
  )
}
