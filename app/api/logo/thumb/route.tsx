import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// 토스 미니앱 가로형 썸네일 — 1932×828
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1932,
          height: 828,
          background: '#F7F5F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 80,
          fontFamily: 'sans-serif',
        }}
      >
        {/* 로고 마크 */}
        <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', flexShrink: 0 }}>
          {/* 뒤 카드 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 84,
              width: 168,
              height: 168,
              borderRadius: 42,
              background: 'rgba(42, 96, 73, 0.20)',
            }}
          />
          {/* 앞 팝업 카드 */}
          <div
            style={{
              position: 'absolute',
              left: 98,
              top: 0,
              width: 168,
              height: 168,
              borderRadius: 42,
              background: '#2A6049',
            }}
          />
        </div>

        {/* 텍스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: '#1A1812',
              letterSpacing: '-4px',
              lineHeight: 1,
              display: 'flex',
            }}
          >
            Popup
          </div>
          <div
            style={{
              fontSize: 40,
              color: '#A09D92',
              letterSpacing: '-0.5px',
              display: 'flex',
            }}
          >
            30초 만에 웹페이지를 만들고 링크로 공유하세요
          </div>
        </div>
      </div>
    ),
    { width: 1932, height: 828 }
  )
}
