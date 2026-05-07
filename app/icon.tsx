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
          background: 'linear-gradient(150deg, #3d8065 0%, #1a3d2b 100%)',
          borderRadius: 7,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 좌상단 하이라이트 */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 16,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
          }}
        />
        {/* 뒤 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 3, top: 13,
            width: 14, height: 14,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.22)',
          }}
        />
        {/* 앞 팝업 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 15, top: 5,
            width: 14, height: 14,
            borderRadius: 3,
            background: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.30)',
          }}
        />
      </div>
    ),
    { width: 32, height: 32 }
  )
}
