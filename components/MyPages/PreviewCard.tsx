'use client'

import { useEffect, useState } from 'react'

interface Props {
  slug: string
  title: string
  daysLeft: number
  locked: boolean
  /** 화면 좌상단 기준 anchor 좌표 (호버된 카드의 위치) */
  anchor: { top: number; left: number; right: number; bottom: number }
}

const PREVIEW_WIDTH = 320
const PREVIEW_IMAGE_HEIGHT = 168 // 1200:630 → 320:168
const GAP = 12

/**
 * /my-pages 카드에 마우스 올렸을 때 우측 또는 위쪽으로 떠오르는 미리보기.
 * OG 이미지 라우트(/[slug]/opengraph-image)를 섬네일로 사용 — 이미 캐시되는 PNG.
 */
export default function PreviewCard({ slug, title, daysLeft, locked, anchor }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardH = PREVIEW_IMAGE_HEIGHT + 60 // 이미지 + 본문 영역 대략

    // 우측 공간 충분 → 카드 우측에 표시
    let left = anchor.right + GAP
    let top = anchor.top
    if (left + PREVIEW_WIDTH > vw - 16) {
      // 우측 공간 부족 → 카드 좌측에 표시
      left = anchor.left - PREVIEW_WIDTH - GAP
    }
    if (left < 16) {
      // 좌우 모두 부족 → 카드 위에 표시
      left = Math.max(16, Math.min(anchor.left, vw - PREVIEW_WIDTH - 16))
      top = anchor.top - cardH - GAP
    }
    if (top + cardH > vh - 16) {
      // 아래로 벗어남 → 위로 끌어올림
      top = Math.max(16, vh - cardH - 16)
    }
    if (top < 16) top = 16

    setPos({ top, left })
    // 다음 프레임에 fade-in
    requestAnimationFrame(() => setVisible(true))
  }, [anchor])

  return (
    <div
      role="tooltip"
      className={`pointer-events-none fixed z-[300] overflow-hidden rounded-xl border border-popup-border bg-popup-white shadow-xl transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: pos.top,
        left: pos.left,
        width: PREVIEW_WIDTH,
      }}
    >
      {/* OG 이미지 섬네일 */}
      <div
        className="bg-popup-surface"
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_IMAGE_HEIGHT }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/${slug}/opengraph-image`}
          alt=""
          loading="lazy"
          width={PREVIEW_WIDTH}
          height={PREVIEW_IMAGE_HEIGHT}
          className="block h-full w-full object-cover"
        />
      </div>

      {/* 메타 */}
      <div className="px-4 py-3">
        <p className="truncate text-sm font-medium text-popup-text">{title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-popup-faint">
          <span>{daysLeft > 0 ? `${daysLeft}일 남음` : '만료됨'}</span>
          {locked && (
            <span className="rounded bg-popup-warn-bg border border-popup-warn-border px-1.5 py-0.5 text-[10px] font-medium text-popup-warn">
              🔒 잠김
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
