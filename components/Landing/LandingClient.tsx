'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingClient() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    // 임시 랜덤 PIN으로 페이지 생성 — 진짜 PIN은 공유 버튼에서 설정
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString()
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: randomPin, blocks: [] }),
    })
    const data = await res.json() as { slug?: string; editToken?: string; error?: string }
    if (!res.ok || !data.slug) {
      alert(data.error ?? '페이지 생성에 실패했습니다.')
      setCreating(false)
      return
    }
    localStorage.setItem(`popup_token_${data.slug}`, data.editToken ?? '')
    // popup_pin_set_${slug} 은 ShareModal에서 PIN 설정 완료 후 저장
    router.push(`/${data.slug}/edit`)
  }

  return (
    <>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="rounded-xl bg-popup-accent px-10 py-3.5 text-[15px] font-medium text-popup-accent-fg hover:bg-popup-accent-hover active:scale-[.98] disabled:opacity-60"
      >
        {creating ? '만드는 중…' : '새 팝업 페이지 만들기'}
      </button>

      {creating && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-popup-white px-7 py-5 text-sm text-popup-muted shadow-lg">
            만드는 중…
          </div>
        </div>
      )}
    </>
  )
}
