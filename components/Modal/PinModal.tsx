'use client'

import { useState } from 'react'
import Modal from '@/components/UI/Modal'

interface PinSetModalProps {
  mode: 'set'
  onConfirm: (pin: string) => void
  onClose: () => void
}

interface PinEnterModalProps {
  mode: 'enter'
  slug: string
  onConfirm: (editToken: string) => void
  onClose: () => void
}

type PinModalProps = PinSetModalProps | PinEnterModalProps

export default function PinModal(props: PinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (pin.length < 4 || pin.length > 8) {
      setError('4~8자리로 입력하세요.')
      return
    }
    setLoading(true)
    setError('')

    if (props.mode === 'set') {
      props.onConfirm(pin)
    } else {
      const res = await fetch(`/api/pages/${props.slug}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'PIN이 올바르지 않습니다.')
        setLoading(false)
        return
      }
      props.onConfirm(data.editToken)
    }
    setLoading(false)
  }

  return (
    <Modal onClose={props.onClose} maxWidth={340}>
      {/* 컴팩트 — 헤더 제거, 인풋이 첫 번째 시각 요소 */}
      <p className="mb-3 text-sm text-popup-muted">
        {props.mode === 'set' ? '수정 비밀번호를 만들어주세요 🔑' : '수정하려면 비밀번호를 입력해주세요'}
      </p>

      <input
        type="password"
        inputMode="numeric"
        placeholder="숫자 4~8자리"
        value={pin}
        maxLength={8}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        className="mb-2 w-full rounded-lg border border-popup-border bg-popup-surface px-3.5 py-3 text-center text-xl tracking-[0.4em] text-popup-text outline-none transition-colors focus:border-popup-accent"
        autoFocus
      />

      {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || pin.length < 4}
        className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-40"
      >
        {loading ? '…' : props.mode === 'set' ? '완료' : '편집 시작'}
      </button>
    </Modal>
  )
}
