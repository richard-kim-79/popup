import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Popup — 30초 만에 웹페이지 만들기'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#2A6049',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span style={{ fontSize: '48px', fontWeight: 800, color: '#1A1812' }}>
            Popup
          </span>
        </div>
        <p style={{ fontSize: '28px', color: '#A09D92', margin: 0 }}>
          30초 만에 웹페이지를 만들고 링크로 공유하세요
        </p>
      </div>
    ),
    { ...size }
  )
}
