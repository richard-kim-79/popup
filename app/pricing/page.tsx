import type { Metadata } from 'next'
import Link from 'next/link'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: '요금제 | Popup',
  description: 'Popup의 Free·Lite·Pro 요금제. 월 또는 연 단위 구독으로 페이지 만료 면제, 더 큰 저장 용량, 커스텀 도메인을 사용하세요.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-popup-bg">
      <nav className="flex h-12 items-center justify-between border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-bold text-popup-text">Popup</Link>
        <div className="flex items-center gap-4 text-xs text-popup-muted">
          <Link href="/my-pages" className="hover:text-popup-text">내 페이지</Link>
        </div>
      </nav>

      <PricingClient />
    </div>
  )
}
