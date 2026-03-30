'use client'

import { useState } from 'react'
import type { ReportReason } from '@/types'

interface Props {
  slug: string
}

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'illegal', label: '불법 콘텐츠' },
  { id: 'spam',    label: '스팸 / 광고' },
  { id: 'adult',   label: '음란물' },
  { id: 'other',   label: '기타' },
]

type Step = 'idle' | 'form' | 'sending' | 'done' | 'error'

export default function ReportButton({ slug }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    if (!reason) return
    setStep('sending')

    const res = await fetch(`/api/pages/${slug}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, detail: detail || undefined }),
    })

    const data = await res.json()

    if (res.ok) {
      setStep('done')
      setMessage('신고가 접수되었습니다.')
    } else {
      setStep('error')
      setMessage(data.error ?? '신고 처리에 실패했습니다.')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('form')}
        className="text-xs text-popup-faint hover:text-popup-muted"
      >
        신고
      </button>
    )
  }

  if (step === 'done' || step === 'error') {
    return (
      <span className={`text-xs ${step === 'done' ? 'text-popup-accent' : 'text-red-500'}`}>
        {message}
      </span>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-popup-border bg-popup-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-popup-text">신고 사유</span>
        <button onClick={() => setStep('idle')} className="text-xs text-popup-muted hover:text-popup-text">취소</button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setReason(r.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              reason === r.id
                ? 'border-popup-accent bg-popup-accent-bg text-popup-accent'
                : 'border-popup-border text-popup-muted hover:border-popup-text'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {reason === 'other' && (
        <input
          type="text"
          placeholder="상세 내용 (선택)"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-popup-border bg-popup-surface px-3 py-2 text-xs text-popup-text outline-none focus:border-popup-accent"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={!reason || step === 'sending'}
        className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
      >
        {step === 'sending' ? '처리 중...' : '신고하기'}
      </button>
    </div>
  )
}
