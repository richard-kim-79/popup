'use client'

import { useEffect } from 'react'
import { ACCENT_PALETTE, SESSION_KEY, applyAccentColor } from '@/lib/palette'

/**
 * 세션당 1회 랜덤 accent 색상을 선택해 CSS 변수에 주입.
 * 같은 탭·세션 안에서는 색상이 유지됨.
 */
export default function ColorTheme() {
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    const hex = saved ?? ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)]
    applyAccentColor(hex)
  }, [])

  return null
}
