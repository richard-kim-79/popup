import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-popup-white">
      <span className="text-3xl font-bold tracking-tight text-popup-text">Popup</span>
      <h1 className="text-2xl font-bold text-popup-text">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-popup-muted">삭제됐거나 주소가 올바르지 않습니다.</p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-popup-accent px-6 py-2.5 text-sm font-medium text-popup-accent-fg transition-colors hover:bg-popup-accent-hover"
      >
        새 페이지 만들기
      </Link>
    </div>
  )
}
