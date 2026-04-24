import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 600,
          background: '#F7F5F0',
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
              background: 'rgba(42, 96, 73, 0.20)',
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
              background: '#2A6049',
            }}
          />
        </div>
      </div>
    ),
    { width: 600, height: 600 }
  )
}
