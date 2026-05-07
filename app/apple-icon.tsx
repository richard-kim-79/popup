import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS 홈화면·macOS PWA 아이콘 (180×180)
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(150deg, #3d8065 0%, #1a3d2b 100%)',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 좌상단 하이라이트 */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 90,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)',
          }}
        />

        {/* 카드 3 — 가장 뒤 */}
        <div
          style={{
            position: 'absolute',
            left: 20, top: 72,
            width: 88, height: 88,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.16)',
            border: '1.5px solid rgba(255,255,255,0.10)',
          }}
        />

        {/* 카드 2 — 중간 */}
        <div
          style={{
            position: 'absolute',
            left: 46, top: 46,
            width: 88, height: 88,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.34)',
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}
        />

        {/* 카드 1 — 앞 (팝업) */}
        <div
          style={{
            position: 'absolute',
            left: 72, top: 20,
            width: 88, height: 88,
            borderRadius: 18,
            background: 'white',
            boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
            display: 'flex',
            flexDirection: 'column',
            padding: '14px 12px',
            gap: 7,
          }}
        >
          {/* 제목 바 */}
          <div style={{ width: '65%', height: 8, background: '#2A6049', borderRadius: 3, opacity: 0.9 }} />
          {/* 콘텐츠 라인 */}
          <div style={{ width: '90%', height: 5, background: '#DDDBD6', borderRadius: 3 }} />
          <div style={{ width: '80%', height: 5, background: '#DDDBD6', borderRadius: 3 }} />
          <div style={{ width: '55%', height: 5, background: '#DDDBD6', borderRadius: 3 }} />
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
