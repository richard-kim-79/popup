'use client'

import { useState } from 'react'
import Modal from '@/components/UI/Modal'

type Period = 'month' | 'year'

interface Props {
  slug: string
  /** 보유한 editToken (있으면 인증에 사용). 로그인 사용자는 생략 가능 */
  editToken?: string | null
  onClose: () => void
  /** 연장 성공 후 콜백 (목록 새로고침 등) */
  onExtended?: () => void
}

const PERIOD_LABEL: Record<Period, string> = {
  month: '한 달 연장',
  year: '1년 연장',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/**
 * "수명 연장" 모달 — 유료 구독자(Lite/Pro) 전용.
 *
 * 남은 수명 위에 1개월/1년을 더함. 결제 없이 즉시 적용.
 */
export default function ExtendLifespanModal({ slug, editToken, onClose, onExtended }: Props) {
  const [step, setStep] = useState<'choose' | 'done'>('choose')
  const [loading, setLoading] = useState<Period | null>(null)
  const [error, setError] = useState('')
  const [until, setUntil] = useState('')

  const handleExtend = async (period: Period) => {
    if (loading) return
    setLoading(period)
    setError('')
    try {
      const res = await fetch(`/api/pages/${slug}/extend-lifespan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, editToken: editToken ?? undefined }),
      })
      const data = await res.json() as { ok?: boolean; expiresAt?: string; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? '연장에 실패했습니다.')
        setLoading(null)
        return
      }
      setUntil(data.expiresAt ?? '')
      setStep('done')
      setLoading(null)
      if (onExtended) setTimeout(() => onExtended(), 1200)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(null)
    }
  }

  return (
    <Modal onClose={loading ? () => {} : onClose} maxWidth={400}>
      {step === 'choose' && (
        <>
          <div className="mb-3 text-3xl">🌱</div>
          <p className="mb-2 text-base font-semibold text-popup-text">
            수명을 연장할까요?
          </p>
          <div className="mb-5 space-y-1 text-sm text-popup-muted">
            <p>남은 수명 위에 선택한 기간만큼 더해져요.</p>
            <p className="text-xs text-popup-faint">구독자 혜택으로 추가 결제는 없어요.</p>
          </div>

          {error && (
            <p className="mb-3 text-xs text-red-500">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            {(['month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void handleExtend(p)}
                disabled={loading !== null}
                className="flex items-center justify-between rounded-lg border border-popup-border bg-popup-white px-4 py-3 text-sm font-medium text-popup-text hover:border-popup-accent hover:bg-popup-accent-bg transition-colors disabled:opacity-50"
              >
                <span>{PERIOD_LABEL[p]}</span>
                <span className="text-xs text-popup-muted">
                  {loading === p ? '연장 중…' : p === 'month' ? '+1개월' : '+1년'}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              disabled={loading !== null}
              className="mt-1 rounded-lg py-2 text-sm text-popup-muted hover:text-popup-text transition-colors disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="py-2 text-center">
          <div className="mb-3 text-3xl">✓</div>
          <p className="mb-1 text-base font-semibold text-popup-text">연장됐어요</p>
          {until && (
            <p className="text-xs text-popup-muted">{formatDate(until)}까지 유지돼요.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
