import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="flex h-11 items-center justify-between px-7">
      <span className="text-sm font-semibold tracking-tight text-popup-text opacity-70">Popup</span>
      <Link
        href="/search"
        className="text-popup-muted transition-colors hover:text-popup-text"
        title="검색"
        aria-label="팝업 검색"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </Link>
    </nav>
  )
}
