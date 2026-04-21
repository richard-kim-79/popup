import Link from 'next/link'

export default function PolicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-popup-bg">
      {/* 상단 네비게이션 */}
      <nav className="border-b border-popup-border bg-popup-bg px-6 py-4">
        <Link href="/" className="inline-flex items-center opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-sm font-semibold text-popup-text">Popup</span>
        </Link>
      </nav>

      {/* 본문 */}
      <main className="mx-auto max-w-[720px] px-6 py-14">
        {children}
        <div className="mt-16 border-t border-popup-border pt-8">
          <Link href="/" className="text-sm text-popup-muted hover:text-popup-text transition-colors">
            ← 홈으로
          </Link>
        </div>
      </main>
    </div>
  )
}
