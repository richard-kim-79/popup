import Logo from '@/components/UI/Logo'

// 랜딩 Nav: 로고만. 시선 분산 요소 없음.
export default function Nav() {
  return (
    <nav className="flex h-11 items-center px-7">
      <div className="flex items-center gap-2 opacity-70">
        <Logo size={17} />
        <span className="text-sm font-semibold tracking-tight text-popup-text">Popup</span>
      </div>
    </nav>
  )
}
