interface LogoProps {
  size?: number
}

export default function Logo({ size = 22 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Popup logo">
      {/* 뒤 창 — 연한 그린 */}
      <rect x="2" y="7" width="14" height="12" rx="2.5" fill="#2E6B52" opacity="0.18" />
      {/* 앞 팝업 창 — 진한 그린 */}
      <rect x="8" y="5" width="14" height="12" rx="2.5" fill="#2E6B52" />
      {/* 타이틀바 구분선 */}
      <line x1="8" y1="9" x2="22" y2="9" stroke="white" strokeWidth="0.9" opacity="0.35" />
      {/* 타이틀바 닫기 도트 */}
      <circle cx="11" cy="7" r="0.85" fill="white" opacity="0.55" />
      {/* 콘텐츠 줄 */}
      <rect x="11" y="11.5" width="7" height="1.1" rx="0.55" fill="white" opacity="0.45" />
      <rect x="11" y="13.8" width="4.5" height="1.1" rx="0.55" fill="white" opacity="0.3" />
    </svg>
  )
}
