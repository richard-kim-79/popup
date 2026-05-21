'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/UI/Modal'
import QRCode from 'react-qr-code'

interface Props {
  slug: string
  onClose: () => void
}

type Step = 'pin-setup' | 'share'

export default function ShareModal({ slug, onClose }: Props) {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim()
  const url = `${baseUrl}/${slug}`

  // PIN을 이미 설정했으면 바로 공유 화면으로
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === 'undefined') return 'pin-setup'
    return localStorage.getItem(`popup_pin_set_${slug}`) ? 'share' : 'pin-setup'
  })

  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'pin-setup') {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [step])

  const handleCopy = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePinSubmit = async () => {
    if (pin.length < 4 || pin.length > 8) {
      setPinError('4~8자리 숫자로 입력해주세요.')
      return
    }
    setPinLoading(true)
    setPinError('')

    const editToken = localStorage.getItem(`popup_token_${slug}`) ?? ''
    const res = await fetch(`/api/pages/${slug}/update-pin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editToken, newPin: pin }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setPinError(data.error ?? '비밀번호 설정에 실패했습니다.')
      setPinLoading(false)
      return
    }

    localStorage.setItem(`popup_pin_set_${slug}`, 'true')
    setPinLoading(false)
    setStep('share')
  }

  // ── PIN 설정 단계 ────────────────────────────────────────────
  if (step === 'pin-setup') {
    return (
      <Modal onClose={onClose} maxWidth={360}>
        <p className="mb-1 text-sm font-semibold text-popup-text">수정 비밀번호 만들기 🔑</p>
        <p className="mb-5 text-xs leading-relaxed text-popup-muted">
          링크를 받은 사람이 내용을 바꾸지 못하도록<br />
          나만의 비밀번호로 보호하세요.
        </p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          placeholder="숫자 4~8자리"
          value={pin}
          maxLength={8}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') void handlePinSubmit() }}
          className="mb-2 w-full rounded-xl border border-popup-border bg-popup-bg px-4 py-3 text-center text-2xl tracking-[0.5em] text-popup-text outline-none transition-colors focus:border-popup-accent"
        />

        {pinError && <p className="mb-2 text-center text-xs text-red-400">{pinError}</p>}

        <button
          onClick={() => void handlePinSubmit()}
          disabled={pinLoading || pin.length < 4}
          className="w-full rounded-xl bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-40 transition-colors"
        >
          {pinLoading ? '설정 중…' : '완료 — 링크 보기 →'}
        </button>
      </Modal>
    )
  }

  // ── 공유 단계 ────────────────────────────────────────────────
  return (
    <Modal onClose={onClose} maxWidth={360}>
      <p className="mb-3 text-sm text-popup-muted">링크를 공유하세요</p>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-popup-border bg-popup-surface px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-xs text-popup-text">{url}</span>
        <button
          onClick={handleCopy}
          className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-all ${
            copied
              ? 'text-popup-accent'
              : 'bg-popup-accent text-popup-accent-fg hover:bg-popup-accent-hover'
          }`}
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowQr((v) => !v)}
          className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
            showQr
              ? 'border-popup-accent text-popup-accent'
              : 'border-popup-border text-popup-muted hover:border-popup-text hover:text-popup-text'
          }`}
        >
          QR코드
        </button>
      </div>

      {showQr && (
        <div className="mt-3 flex justify-center rounded-lg bg-popup-surface p-4">
          <QRCode value={url} size={140} bgColor="transparent" />
        </div>
      )}
    </Modal>
  )
}
