import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 600,
          background: '#1A1812',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: 320, height: 320, display: 'flex' }}>
          {/* 뒤 카드 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 96,
              width: 192,
              height: 192,
              borderRadius: 48,
              background: 'rgba(111, 188, 152, 0.25)',
            }}
          />
          {/* 앞 팝업 카드 */}
          <div
            style={{
              position: 'absolute',
              left: 112,
              top: 0,
              width: 192,
              height: 192,
              borderRadius: 48,
              background: '#6FBC98',
            }}
          />
        </div>
      </div>
    ),
    { width: 600, height: 600 }
  )
}
