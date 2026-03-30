'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Landing/Nav'
import Hero from '@/components/Landing/Hero'
import PricingTeaser from '@/components/Landing/PricingTeaser'
import PinModal from '@/components/Modal/PinModal'

export default function LandingPage() {
  const router = useRouter()
  const [showPin, setShowPin] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleStart = () => setShowPin(true)

  const handlePinConfirm = async (pin: string) => {
    setCreating(true)
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, blocks: [] }),
    })
    const data = await res.json()

    if (!res.ok || !data.slug) {
      alert(data.error ?? '페이지 생성에 실패했습니다.')
      setCreating(false)
      return
    }

    localStorage.setItem(`popup_token_${data.slug}`, data.editToken)
    setCreating(false)
    setShowPin(false)
    router.push(`/${data.slug}/edit`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-popup-bg">
      <Nav />
      <Hero onStart={handleStart} />
      <PricingTeaser />

      {showPin && !creating && (
        <PinModal
          mode="set"
          onConfirm={handlePinConfirm}
          onClose={() => setShowPin(false)}
        />
      )}

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
