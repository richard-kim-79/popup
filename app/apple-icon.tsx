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
          background: '#2A6049',
          display: 'flex',
          position: 'relative',
        }}
      >
        {/* 뒤 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 28, top: 76,
            width: 76, height: 76,
            borderRadius: 19,
            background: 'rgba(255,255,255,0.28)',
          }}
        />
        {/* 앞 팝업 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 76, top: 28,
            width: 76, height: 76,
            borderRadius: 19,
            background: 'white',
          }}
        />
      </div>
    ),
    { width: 180, height: 180 }
  )
}
