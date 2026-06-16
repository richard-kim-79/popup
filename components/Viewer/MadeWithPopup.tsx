import Link from 'next/link'

interface Props {
  /** 유입 출처 — 랜딩에서 ?ref=로 받아 생성 시 pages.source에 기록 (바이럴 측정용).
   *  'ref'는 React 예약 prop이라 사용 불가 → 'source'로 둔다. */
  source?: 'shared' | 'expired'
  /** 'inline' = 푸터용 한 줄 / 'cta' = 만료 화면용 강조 버튼 */
  variant?: 'inline' | 'cta'
}

/**
 * 공유 페이지를 보는 방문자(비소유자)에게 "나도 만들기"를 노출하는 바이럴 루프 CTA.
 * 공개 페이지 푸터 + 만료/잠금 막다른 화면에서 재사용.
 */
export default function MadeWithPopup({ source = 'shared', variant = 'inline' }: Props) {
  const href = `/?ref=${source}`

  if (variant === 'cta') {
    return (
      <Link
        href={href}
        className="text-xs text-popup-faint underline-offset-2 hover:text-popup-accent hover:underline"
      >
        나도 30초 만에 만들기 →
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="text-[11px] text-popup-faint transition-colors hover:text-popup-accent"
    >
      이 페이지는 <span className="font-semibold">Popup</span>으로 만들었어요 · 나도 만들기 →
    </Link>
  )
}
