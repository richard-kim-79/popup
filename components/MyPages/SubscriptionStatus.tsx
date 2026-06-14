'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SubscriptionData {
  id: string
  tier: string
  billing_cycle: string
  status: string
  current_period_end: string
  next_charge_at: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  card_company: string | null
  card_number_masked: string | null
}

const TIER_LABEL: Record<string, string> = { lite: 'Lite', pro: 'Pro' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function SubscriptionStatus() {
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    void fetch('/api/subscriptions')
      .then((r) => r.json())
      .then((d: { subscription?: SubscriptionData | null }) => {
        setSub(d.subscription ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCancel = async () => {
    if (!confirm('현재 결제 주기가 끝날 때 자동 해지됩니다. 계속하시겠어요?')) return
    setCanceling(true)
    try {
      const res = await fetch('/api/subscriptions', { method: 'DELETE' })
      if (res.ok) {
        // 로컬 상태 갱신
        setSub((s) => (s ? { ...s, cancel_at_period_end: true } : s))
      } else {
        const data = await res.json() as { error?: string }
        alert(data.error ?? '해지에 실패했어요.')
      }
    } finally {
      setCanceling(false)
    }
  }

  if (loading) return null
  if (!sub) {
    // 구독 없음 — 가벼운 업그레이드 안내
    return (
      <Link
        href="/pricing"
        className="mb-4 flex items-center justify-between rounded-xl border border-popup-accent/30 bg-popup-accent-bg px-4 py-3 text-xs text-popup-accent hover:bg-popup-accent-bg/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>✨</span>
          <span>페이지 만료 면제 · 더 큰 저장 용량 — Lite / Pro 살펴보기</span>
        </span>
        <span>→</span>
      </Link>
    )
  }

  const tierLabel = TIER_LABEL[sub.tier] ?? sub.tier
  const cycleLabel = sub.billing_cycle === 'yearly' ? '연간' : '월간'
  const isCanceling = sub.cancel_at_period_end
  const isPastDue = sub.status === 'past_due'

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 ${
      isPastDue
        ? 'border-popup-warn-border bg-popup-warn-bg'
        : 'border-popup-border bg-popup-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-popup-text">{tierLabel}</span>
            <span className="text-[10px] text-popup-muted">{cycleLabel}</span>
            {isPastDue && (
              <span className="rounded bg-popup-warn-border/40 px-1.5 py-0.5 text-[10px] font-medium text-popup-warn">결제 실패</span>
            )}
            {isCanceling && !isPastDue && (
              <span className="rounded bg-popup-surface px-1.5 py-0.5 text-[10px] text-popup-muted">해지 예정</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-popup-faint">
            {isCanceling ? '해지 예정일' : '다음 결제일'}: {formatDate(sub.next_charge_at)}
            {sub.card_company && sub.card_number_masked && (
              <span className="ml-2 text-popup-muted">· {sub.card_company} {sub.card_number_masked.slice(-4).replace(/[^0-9]/g, '****')}</span>
            )}
          </p>
        </div>
        {!isCanceling && (
          <button
            onClick={() => void handleCancel()}
            disabled={canceling}
            className="shrink-0 text-[11px] text-popup-muted underline-offset-2 hover:text-popup-text hover:underline disabled:opacity-50"
          >
            {canceling ? '처리 중…' : '해지'}
          </button>
        )}
      </div>
    </div>
  )
}
