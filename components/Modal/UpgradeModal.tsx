'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/UI/Modal'
import type { Plan } from '@/types'

interface Props {
  slug: string
  onClose: () => void
}

type Step = 'plan' | 'auth' | 'pay' | 'done'

const PLANS: { id: Plan; label: string; price: string; amount: number; sub: string; badge?: string }[] = [
  { id: 'month', label: '1개월 연장', price: '1,000원', amount: 1000, sub: '잠금 해제 · 계속 편집' },
  { id: 'year',  label: '1년 연장',   price: '10,000원', amount: 10000, sub: '월 833원 · 2개월 무료', badge: '추천' },
]

export default function UpgradeModal({ slug, onClose }: Props) {
  const [step, setStep] = useState<Step>('plan')
  const [plan, setPlan] = useState<Plan>('year')
  const [email, setEmail] = useState('')
  const [paying, setPaying] = useState(false)
  const [widgetReady, setWidgetReady] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef = useRef<any>(null)
  const orderIdRef = useRef<string>('')

  const selectedPlan = PLANS.find((p) => p.id === plan)!

  // 결제위젯 마운트 — pay 스텝 진입 시
  useEffect(() => {
    if (step !== 'pay') return

    let cancelled = false

    const mountWidget = async () => {
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
          widgets.renderPaymentMethods({ selector: '#toss-payment-method', variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: '#toss-agreement', variantKey: 'AGREEMENT' }),
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
  }, [step, plan, slug, selectedPlan.amount])

  const handlePay = async () => {
    if (!widgetsRef.current || !widgetReady) return
    setPaying(true)
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim()

    try {
      await widgetsRef.current.requestPayment({
        orderId: orderIdRef.current,
        orderName: `Popup ${selectedPlan.label} 이용권`,
        customerEmail: email || undefined,
        successUrl: `${baseUrl}/payment/success?slug=${slug}&email=${encodeURIComponent(email)}`,
        failUrl: `${baseUrl}/payment/fail?slug=${slug}`,
      })
    } catch (err) {
      const error = err as { code?: string; message?: string }
      if (error.code === 'USER_CANCEL' || error.code === 'PAY_PROCESS_CANCELED') {
        setPaying(false)
        return
      }
      const code = error.code ? `[${error.code}] ` : ''
      alert(`${code}${error.message ?? '결제 중 오류가 발생했습니다. 다시 시도해주세요.'}`)
      setPaying(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={step === 'pay' ? 480 : 380}>
      {step === 'plan' && (
        <>
          <p className="mb-4 text-sm text-popup-muted">플랜을 선택하세요</p>

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
                <span className={`text-sm font-semibold ${plan === p.id ? 'text-popup-accent' : 'text-popup-text'}`}>{p.price}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('auth')}
            className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
          >
            계속하기
          </button>
          <p className="mt-2 text-center text-[11px] text-popup-faint">토스페이먼츠 · 카드/간편결제</p>
        </>
      )}

      {step === 'auth' && (
        <>
          <button onClick={() => setStep('plan')} className="mb-4 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>
          <p className="mb-1 text-sm font-semibold text-popup-text">이메일 (선택)</p>
          <p className="mb-4 text-xs text-popup-muted">결제 확인 이메일을 받을 주소를 입력하세요.</p>

          <input
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setStep('pay') }}
            className="mb-2.5 w-full rounded-lg border border-popup-border bg-popup-surface px-3 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
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

      {step === 'pay' && (
        <>
          <button onClick={() => setStep('auth')} className="mb-3 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>

          {/* 금액 요약 */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-popup-surface px-4 py-3">
            <span className="text-sm text-popup-muted">Popup {selectedPlan.label}</span>
            <span className="text-sm font-semibold text-popup-text">{selectedPlan.price}</span>
          </div>

          {/* 결제위젯 컨테이너 */}
          {!widgetReady && (
            <div className="flex items-center justify-center py-10 text-sm text-popup-muted">
              결제 수단 불러오는 중…
            </div>
          )}
          <div id="toss-payment-method" className={widgetReady ? '' : 'hidden'} />
          <div id="toss-agreement" className={widgetReady ? 'mt-3' : 'hidden'} />

          <button
            onClick={handlePay}
            disabled={!widgetReady || paying}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#3182F6' }}
          >
            {paying ? '처리 중…' : '결제하기'}
          </button>
        </>
      )}

      {step === 'done' && (
        <div className="py-6 text-center">
          <div className="mb-3 text-2xl text-popup-accent">✓</div>
          <p className="mb-1 text-base font-semibold text-popup-text">결제 완료</p>
          <p className="mb-6 text-sm text-popup-muted">페이지를 계속 사용할 수 있어요.</p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
          >
            에디터로 돌아가기
          </button>
        </div>
      )}
    </Modal>
  )
}
