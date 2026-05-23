'use client'

import { useState } from 'react'
import UpgradeModal from '@/components/Modal/UpgradeModal'
import { isFreeExtensionPeriod } from '@/lib/promo'

interface Props {
  slug: string
}

export default function LockedBanner({ slug }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const promo = isFreeExtensionPeriod()

  return (
    <>
      <div className="border-b border-popup-warn-border bg-popup-warn-bg px-6 py-3 text-center text-sm text-popup-warn">
        이 페이지는 잠겨있습니다.{' '}
        <button
          onClick={() => setShowUpgrade(true)}
          className="font-medium underline hover:opacity-80"
        >
          {promo ? '🎉 무료로 잠금 해제하기' : '잠금 해제하기'}
        </button>
      </div>

      {showUpgrade && (
        <UpgradeModal slug={slug} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  )
}
