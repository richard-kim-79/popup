'use client'

import { useState } from 'react'
import Modal from '@/components/UI/Modal'

interface Props {
  slug: string
  /** 보유한 editToken (있으면 인증에 사용). 로그인 사용자는 생략 가능 */
  editToken?: string | null
  onClose: () => void
  /** 만료 처리 성공 후 콜백 (목록 새로고침 / 페이지 이동 등) */
  onExpired?: () => void
}

/**
 * "지금 만료시키기" 확인 모달.
 *
 * 톤은 빨간 위험 색이 아닌 popup-warn(노랑) — 영구 삭제가 아님을 시각적으로 전달.
 * 본문 강조: "1년 안에 연장하면 다시 살릴 수 있어요"
 */
export default function ExpireNowModal({ slug, editToken, onClose, onExpired }: Props) {
  const [step, setStep] = useState<'confirm' | 'done'>('confirm')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/pages/${slug}/expire-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editToken: editToken ?? undefined }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? '만료 처리에 실패했습니다.')
        setLoading(false)
        return
      }
      setStep('done')
      setLoading(false)
      if (onExpired) {
        // 짧게 사용자가 인지할 시간을 주고 콜백 실행
        setTimeout(() => onExpired(), 1200)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={loading ? () => {} : onClose} maxWidth={400}>
      {step === 'confirm' && (
        <>
          <div className="mb-3 text-3xl">⏱</div>
          <p className="mb-2 text-base font-semibold text-popup-text">
            지금 만료시킬까요?
          </p>
          <div className="mb-5 space-y-1 text-sm text-popup-muted">
            <p>지금 만료시키면 즉시 보기가 차단돼요.</p>
            <p>
              <span className="font-medium text-popup-text">1년 안에 연장하면 다시 살릴 수 있어요.</span>
            </p>
            <p className="text-xs text-popup-faint mt-2">2년 후에는 영구 삭제됩니다.</p>
          </div>

          {error && (
            <p className="mb-3 text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-popup-border bg-popup-white py-2.5 text-sm text-popup-muted hover:border-popup-text hover:text-popup-text transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="flex-1 rounded-lg border border-popup-warn-border bg-popup-warn-bg py-2.5 text-sm font-medium text-popup-warn hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '만료 중…' : '지금 만료시키기'}
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="py-2 text-center">
          <div className="mb-3 text-3xl">✓</div>
          <p className="mb-1 text-base font-semibold text-popup-text">만료됐어요</p>
          <p className="text-xs text-popup-muted">1년 안에 연장하면 다시 살릴 수 있어요.</p>
        </div>
      )}
    </Modal>
  )
}
