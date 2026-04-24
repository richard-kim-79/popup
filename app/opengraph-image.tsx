import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Popup — 30초 만에 웹페이지 만들기'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// 구글 검색 / SNS 공유 시 노출되는 OG 이미지
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F5F0',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 로고 마크 — 두 카드 겹침 */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 40, display: 'flex' }}>
          {/* 뒤 카드 */}
          <div
            style={{
              position: 'absolute',
              left: 0, top: 36,
              width: 72, height: 72,
              borderRadius: 18,
              background: 'rgba(42, 96, 73, 0.22)',
            }}
          />
          {/* 앞 팝업 카드 */}
          <div
            style={{
              position: 'absolute',
              left: 44, top: 0,
              width: 72, height: 72,
              borderRadius: 18,
              background: '#2A6049',
            }}
          />
        </div>

        {/* 워드마크 */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#1A1812',
            letterSpacing: '-2px',
            marginBottom: 20,
            display: 'flex',
          }}
        >
          Popup
        </div>

        {/* 태그라인 */}
        <div
          style={{
            fontSize: 28,
            color: '#A09D92',
            display: 'flex',
          }}
        >
          30초 만에 웹페이지를 만들고 링크로 공유하세요
        </div>
      </div>
    ),
    { ...size }
  )
}
