'use client'

import { useState } from 'react'
import UpgradeModal from '@/components/Modal/UpgradeModal'

interface Props {
  slug: string
  remaining: number
}

export default function ExpiryUpgradeButton({ slug, remaining }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)

  const label = remaining > 0 ? `${remaining}일 후 소멸` : '소멸됨'

  return (
    <>
      <button
        onClick={() => setShowUpgrade(true)}
        className="text-xs text-popup-faint transition-colors hover:text-popup-accent"
        title="페이지 유지하기"
      >
        {label}
      </button>

      {showUpgrade && (
        <UpgradeModal slug={slug} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  )
}
