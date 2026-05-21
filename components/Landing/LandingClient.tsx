'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'cta' | 'pin'

export default function LandingClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('cta')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // PIN 입력 단계로 전환되면 자동 포커스
  useEffect(() => {
    if (step === 'pin') {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [step])

  const handleCreate = async () => {
    if (pin.length < 4) {
      setPinError('4자리 이상 입력해주세요.')
      inputRef.current?.focus()
      return
    }
    setPinError('')
    setCreating(true)

    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, blocks: [] }),
    })
    const data = await res.json() as { slug?: string; editToken?: string; error?: string }

    if (!res.ok || !data.slug) {
      setPinError(data.error ?? '페이지 생성에 실패했습니다.')
      setCreating(false)
      return
    }

    // editToken 저장 + PIN 설정 완료 플래그 (ShareModal이 pin-setup 단계 건너뜀)
    localStorage.setItem(`popup_token_${data.slug}`, data.editToken ?? '')
    localStorage.setItem(`popup_pin_set_${data.slug}`, 'true')

    router.push(`/${data.slug}/edit`)
  }

  // ── CTA 단계 ───────────────────────────────────────────────
  if (step === 'cta') {
    return (
      <button
        onClick={() => setStep('pin')}
        className="rounded-xl bg-popup-accent px-10 py-3.5 text-[15px] font-medium text-popup-accent-fg hover:bg-popup-accent-hover active:scale-[.98]"
      >
        새 팝업 페이지 만들기
      </button>
    )
  }

  // ── PIN 입력 단계 ───────────────────────────────────────────
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <p className="text-sm font-semibold text-popup-text">나만의 수정 비밀번호를 정해주세요 🔑</p>
      <p className="text-xs text-popup-muted">이 번호로 언제든지 페이지를 고칠 수 있어요</p>

      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        placeholder="숫자 4~8자리"
        value={pin}
        maxLength={8}
        onChange={(e) => {
          setPin(e.target.value.replace(/\D/g, ''))
          setPinError('')
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
        className="w-full rounded-xl border border-popup-border bg-popup-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-popup-text outline-none transition-colors focus:border-popup-accent"
      />

      {pinError && (
        <p className="text-xs text-red-400">{pinError}</p>
      )}

      <button
        onClick={() => void handleCreate()}
        disabled={creating || pin.length < 4}
        className="w-full rounded-xl bg-popup-accent py-3 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-40 transition-colors"
      >
        {creating ? '만드는 중…' : '페이지 만들기 →'}
      </button>

      <button
        onClick={() => { setStep('cta'); setPin(''); setPinError('') }}
        className="text-xs text-popup-muted hover:text-popup-text"
      >
        취소
      </button>

      {creating && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-popup-white px-7 py-5 text-sm text-popup-muted shadow-lg">
            만드는 중…
          </div>
        </div>
      )}
    </div>
  )
}
