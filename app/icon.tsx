import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// 브라우저 탭·구글 검색 파비콘 — 32×32
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#2A6049',
          display: 'flex',
          position: 'relative',
        }}
      >
        {/* 뒤 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 5, top: 13,
            width: 14, height: 14,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.28)',
          }}
        />
        {/* 앞 팝업 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 13, top: 5,
            width: 14, height: 14,
            borderRadius: 3,
            background: 'white',
          }}
        />
      </div>
    ),
    { width: 32, height: 32 }
  )
}
