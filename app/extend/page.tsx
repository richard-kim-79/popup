'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isFreeExtensionPeriod, PROMO_HEADLINE } from '@/lib/promo'
import type { Plan } from '@/types'

type Step = 'url' | 'plan' | 'auth' | 'pay'

const PLANS: { id: Plan; label: string; price: string; amount: number; sub: string; badge?: string }[] = [
  { id: 'month', label: '1개월 연장', price: '1,000원', amount: 1000, sub: '잠금 해제 · 계속 편집' },
  { id: 'year',  label: '1년 연장',   price: '10,000원', amount: 10000, sub: '월 833원 · 2개월 무료', badge: '추천' },
]

function extractSlug(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  // popup2026.com/abc123 또는 https://... 형태에서 마지막 경로 추출
  const match = trimmed.match(/\/([^/?#]+)$/)
  if (match) return match[1]
  return trimmed
}

export default function ExtendPage() {
  const router = useRouter()
  const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').replace(/\/$/, '')
  const BASE_DOMAIN = BASE_URL.replace(/^https?:\/\//, '')
  const promo = isFreeExtensionPeriod()

  const [step, setStep]           = useState<Step>('url')
  const [urlInput, setUrlInput]   = useState('')
  const [slug, setSlug]           = useState('')
  const [urlError, setUrlError]   = useState('')
  const [urlLoading, setUrlLoading] = useState(false)

  const [plan, setPlan]           = useState<Plan>('year')
  const [email, setEmail]         = useState('')
  const [paying, setPaying]       = useState(false)
  const [widgetReady, setWidgetReady] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef  = useRef<any>(null)
  const orderIdRef  = useRef<string>('')

  const selectedPlan = PLANS.find((p) => p.id === plan)!

  // ── ?slug= 사전 채움 (잠긴 페이지에서 "연장하기" 클릭 시) ─────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const prefilled = params.get('slug')?.trim()
    if (!prefilled || step !== 'url' || slug) return
    // 페이지 존재 확인 후 STEP 'plan'으로 점프
    void (async () => {
      const res = await fetch(`/api/pages/${prefilled}`)
      if (res.ok) {
        setSlug(prefilled)
        setUrlInput(`${BASE_DOMAIN}/${prefilled}`)
        setStep('plan')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── URL 검증 ──────────────────────────────────────────────
  const handleUrlSubmit = async () => {
    const s = extractSlug(urlInput)
    if (!s) {
      setUrlError('페이지 주소를 입력해주세요.')
      return
    }
    setUrlLoading(true)
    setUrlError('')
    try {
      const res = await fetch(`/api/pages/${s}`)
      if (!res.ok) {
        setUrlError('해당 페이지를 찾을 수 없습니다. 주소를 다시 확인해주세요.')
        setUrlLoading(false)
        return
      }
      setSlug(s)
      setStep('plan')
    } catch {
      setUrlError('네트워크 오류가 발생했습니다.')
    }
    setUrlLoading(false)
  }

  // ── 무료 연장 처리 ────────────────────────────────────────
  const handleFreeExtend = async () => {
    if (paying) return
    setPaying(true)
    try {
      const res = await fetch('/api/payments/free-extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, plan, email: email || undefined }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        alert(data.error ?? '연장에 실패했습니다.')
        setPaying(false)
        return
      }
      router.push(`/payment/success?slug=${slug}&email=${encodeURIComponent(email)}&free=1`)
    } catch {
      alert('네트워크 오류가 발생했습니다.')
      setPaying(false)
    }
  }

  // ── TossPayments 위젯 마운트 ──────────────────────────────
  useEffect(() => {
    if (step !== 'pay' || promo) return  // 프로모 기간엔 위젯 마운트 스킵
    let cancelled = false

    const mountWidget = async () => {
      // CDN 로드 대기
      // @ts-expect-error — TossPayments loaded via CDN
      if (typeof window.TossPayments === 'undefined') {
        let waited = 0
        while (waited < 5000) {
          await new Promise((r) => setTimeout(r, 300))
          waited += 300
          // @ts-expect-error
          if (typeof window.TossPayments !== 'undefined') break
        }
      }
      if (cancelled) return

      try {
        const clientKey = (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '').trim()
        // @ts-expect-error
        const tossPayments = TossPayments(clientKey)

        orderIdRef.current = `${slug}_${plan}_${Date.now()}`
        const widgets = tossPayments.widgets({ customerKey: orderIdRef.current })
        widgetsRef.current = widgets

        await widgets.setAmount({ currency: 'KRW', value: selectedPlan.amount })
        if (cancelled) return

        await Promise.all([
          widgets.renderPaymentMethods({ selector: '#extend-payment-method', variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: '#extend-agreement', variantKey: 'AGREEMENT' }),
        ])

        if (!cancelled) setWidgetReady(true)
      } catch (err) {
        if (!cancelled) {
          const e = err as { message?: string }
          alert(`결제 위젯 초기화 실패: ${e.message ?? '알 수 없는 오류'}`)
        }
      }
    }

    setWidgetReady(false)
    void mountWidget()
    return () => { cancelled = true }
  }, [step, plan, slug, selectedPlan.amount, promo])

  // ── 결제 요청 ─────────────────────────────────────────────
  const handlePay = async () => {
    if (!widgetsRef.current || !widgetReady) return
    setPaying(true)
    try {
      await widgetsRef.current.requestPayment({
        orderId: orderIdRef.current,
        orderName: `Popup ${selectedPlan.label} 이용권`,
        customerEmail: email || undefined,
        successUrl: `${BASE_URL}/payment/success?slug=${slug}&email=${encodeURIComponent(email)}`,
        failUrl:    `${BASE_URL}/payment/fail?slug=${slug}`,
      })
    } catch (err) {
      const error = err as { code?: string; message?: string }
      if (error.code === 'USER_CANCEL' || error.code === 'PAY_PROCESS_CANCELED') {
        setPaying(false)
        return
      }
      alert(`${error.code ? `[${error.code}] ` : ''}${error.message ?? '결제 중 오류가 발생했습니다.'}`)
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-popup-bg">
      {/* 네비게이션 */}
      <nav className="flex h-11 items-center border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-semibold text-popup-text opacity-70 hover:opacity-100 transition-opacity">
          Popup
        </Link>
      </nav>

      <div className="mx-auto max-w-[440px] px-6 py-16">

        {/* ── STEP 1: 페이지 주소 입력 ──────────────────── */}
        {step === 'url' && (
          <>
            <h1 className="mb-2 text-xl font-bold text-popup-text">페이지 연장하기</h1>
            <p className="mb-8 text-sm text-popup-muted">
              연장할 팝업 페이지의 주소를 입력해주세요.
            </p>

            <label className="mb-1.5 block text-xs font-medium text-popup-muted">페이지 주소</label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleUrlSubmit() }}
              placeholder={`${BASE_DOMAIN}/abc123`}
              className="mb-2 w-full rounded-lg border border-popup-border bg-popup-white px-3.5 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
              autoFocus
            />
            {urlError && <p className="mb-2 text-xs text-red-400">{urlError}</p>}
            <button
              onClick={() => void handleUrlSubmit()}
              disabled={urlLoading || !urlInput.trim()}
              className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-40"
            >
              {urlLoading ? '확인 중…' : '다음'}
            </button>
          </>
        )}

        {/* ── STEP 2: 플랜 선택 ─────────────────────────── */}
        {step === 'plan' && (
          <>
            <button onClick={() => setStep('url')} className="mb-6 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>
            <h1 className="mb-1 text-xl font-bold text-popup-text">플랜 선택</h1>
            <p className="mb-4 text-xs text-popup-faint font-mono">{BASE_DOMAIN}/{slug}</p>

            {promo && (
              <div className="mb-4 rounded-lg border border-popup-accent/30 bg-popup-accent-bg px-3 py-2.5 text-center text-xs font-medium text-popup-accent">
                {PROMO_HEADLINE}
              </div>
            )}

            <div className="mb-4 flex flex-col gap-2">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                    plan === p.id
                      ? 'border-popup-accent bg-popup-accent-bg'
                      : 'border-popup-border hover:border-popup-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${plan === p.id ? 'border-popup-accent bg-popup-accent' : 'border-popup-border'}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-popup-text">{p.label}</span>
                        {p.badge && (
                          <span className="rounded-full bg-popup-accent px-1.5 py-0.5 text-[10px] font-medium text-popup-accent-fg">{p.badge}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-popup-muted">{p.sub}</div>
                    </div>
                  </div>
                  {promo ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-popup-faint line-through">{p.price}</span>
                      <span className={`text-sm font-semibold ${plan === p.id ? 'text-popup-accent' : 'text-popup-text'}`}>무료</span>
                    </div>
                  ) : (
                    <span className={`text-sm font-semibold ${plan === p.id ? 'text-popup-accent' : 'text-popup-text'}`}>{p.price}</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('auth')}
              className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
            >
              계속하기
            </button>
            <p className="mt-2 text-center text-[11px] text-popup-faint">
              {promo ? '이벤트 기간 · 결제 없이 바로 연장' : '토스페이먼츠 · 카드/간편결제'}
            </p>
          </>
        )}

        {/* ── STEP 3: 이메일 (선택) ─────────────────────── */}
        {step === 'auth' && (
          <>
            <button onClick={() => setStep('plan')} className="mb-6 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>
            <h1 className="mb-1 text-xl font-bold text-popup-text">이메일 (선택)</h1>
            <p className="mb-6 text-sm text-popup-muted">결제 확인 이메일을 받을 주소를 입력하세요.</p>

            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setStep('pay') }}
              className="mb-2.5 w-full rounded-lg border border-popup-border bg-popup-white px-3.5 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
              autoFocus
            />
            <button
              onClick={() => setStep('pay')}
              className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
            >
              {email ? '이메일로 계속' : '건너뛰고 결제'}
            </button>
          </>
        )}

        {/* ── STEP 4: 결제 (또는 무료 연장 확정) ────────── */}
        {step === 'pay' && !promo && (
          <>
            <button onClick={() => setStep('auth')} className="mb-4 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>

            {/* 금액 요약 */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-popup-border bg-popup-white px-4 py-3">
              <span className="text-sm text-popup-muted">Popup {selectedPlan.label}</span>
              <span className="text-sm font-semibold text-popup-text">{selectedPlan.price}</span>
            </div>

            {!widgetReady && (
              <div className="flex items-center justify-center py-10 text-sm text-popup-muted">
                결제 수단 불러오는 중…
              </div>
            )}
            <div id="extend-payment-method" className={widgetReady ? '' : 'hidden'} />
            <div id="extend-agreement" className={widgetReady ? 'mt-3' : 'hidden'} />

            <button
              onClick={() => void handlePay()}
              disabled={!widgetReady || paying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#3182F6' }}
            >
              {paying ? '처리 중…' : `${selectedPlan.price} 결제하기`}
            </button>
          </>
        )}

        {step === 'pay' && promo && (
          <>
            <button onClick={() => setStep('auth')} className="mb-4 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>

            <div className="mb-5 rounded-2xl border border-popup-accent/30 bg-popup-accent-bg px-5 py-6 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-base font-semibold text-popup-accent mb-1">{selectedPlan.label} 무료</p>
              <p className="text-xs text-popup-muted">이벤트 기간 · 결제 없이 바로 연장</p>
            </div>

            <button
              onClick={() => void handleFreeExtend()}
              disabled={paying}
              className="w-full rounded-lg bg-popup-accent py-3 text-sm font-semibold text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-50"
            >
              {paying ? '연장 중…' : '🎉 무료로 연장하기'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}
