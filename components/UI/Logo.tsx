interface LogoProps {
  size?: number
}

export default function Logo({ size = 22 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Popup"
      style={{ color: 'var(--color-popup-accent, #2A6049)' }}
    >
      {/* 뒤 카드 — 연한 레이어 */}
      <rect x="2" y="8" width="13" height="13" rx="3.5" fill="currentColor" opacity="0.22" />
      {/* 앞 팝업 카드 — 메인 */}
      <rect x="9" y="3" width="13" height="13" rx="3.5" fill="currentColor" />
    </svg>
  )
}
