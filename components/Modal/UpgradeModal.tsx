'use client'

import { useState } from 'react'
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

  const selectedPlan = PLANS.find((p) => p.id === plan)!

  const handlePay = async () => {
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim()
    const orderId = `${slug}_${plan}_${Date.now()}`

    // @ts-expect-error — TossPayments v2 loaded via CDN
    if (typeof window.TossPayments === 'undefined') {
      alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    try {
      // @ts-expect-error
      const tossPayments = await window.TossPayments((process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '').trim())
      // customerKey: 거래별 고유값 (orderId 재사용 — 2~50자, 영문/숫자/_)
      const payment = tossPayments.payment({ customerKey: orderId })

      await payment.request({
        method: '카드',
        amount: { currency: 'KRW', value: selectedPlan.amount },
        orderId,
        orderName: `Popup ${selectedPlan.label} 이용권`,
        customerEmail: email || undefined,
        successUrl: `${baseUrl}/payment/success?slug=${slug}&email=${encodeURIComponent(email)}`,
        failUrl: `${baseUrl}/payment/fail?slug=${slug}`,
      })
    } catch (err) {
      const error = err as { code?: string; message?: string }
      // 사용자가 직접 닫은 경우는 무시
      if (error.code === 'USER_CANCEL' || error.code === 'PAY_PROCESS_CANCELED') return
      alert(error.message ?? '결제 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={380}>
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
                        <span className="rounded-full bg-popup-accent px-1.5 py-0.5 text-[10px] font-medium text-white">{p.badge}</span>
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
            className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-white hover:bg-popup-accent-hover"
          >
            계속하기
          </button>
          <p className="mt-2 text-center text-[11px] text-popup-faint">토스페이먼츠 · 카드/계좌이체</p>
        </>
      )}

      {step === 'auth' && (
        <>
          <button onClick={() => setStep('plan')} className="mb-4 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>
          <p className="mb-4 text-sm text-popup-muted">이메일로 페이지를 관리하세요</p>

          <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-popup-border bg-popup-white py-2.5 text-sm text-popup-text transition-colors hover:bg-popup-surface">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google로 계속
          </button>

          <div className="my-3 flex items-center gap-2">
            <hr className="flex-1 border-popup-border" />
            <span className="text-[11px] text-popup-faint">또는</span>
            <hr className="flex-1 border-popup-border" />
          </div>

          <input
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) setStep('pay') }}
            className="mb-2.5 w-full rounded-lg border border-popup-border bg-popup-surface px-3 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
          />
          <button
            onClick={() => setStep('pay')}
            disabled={!email}
            className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-white hover:bg-popup-accent-hover disabled:opacity-40"
          >
            이메일로 계속
          </button>
          <button
            onClick={() => setStep('pay')}
            className="mt-3 w-full text-center text-xs text-popup-faint hover:text-popup-muted"
          >
            건너뛰기
          </button>
        </>
      )}

      {step === 'pay' && (
        <>
          <button onClick={() => setStep('auth')} className="mb-4 text-xs text-popup-muted hover:text-popup-text">← 뒤로</button>

          <div className="mb-4 flex items-center justify-between rounded-lg bg-popup-surface px-4 py-3">
            <span className="text-sm text-popup-muted">Popup {selectedPlan.label}</span>
            <span className="text-sm font-semibold text-popup-text">{selectedPlan.price}</span>
          </div>
          {email && (
            <p className="mb-3 text-center text-xs text-popup-muted">📧 {email}</p>
          )}

          <button
            onClick={handlePay}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#3182F6' }}
          >
            토스페이로 결제
          </button>
          <p className="mt-2 text-center text-[11px] text-popup-faint">카드 · 계좌이체 · 토스머니</p>
        </>
      )}

      {step === 'done' && (
        <div className="py-6 text-center">
          <div className="mb-3 text-2xl text-popup-accent">✓</div>
          <p className="mb-1 text-base font-semibold text-popup-text">결제 완료</p>
          <p className="mb-6 text-sm text-popup-muted">페이지를 계속 사용할 수 있어요.</p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-white hover:bg-popup-accent-hover"
          >
            에디터로 돌아가기
          </button>
        </div>
      )}
    </Modal>
  )
}
