import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// 브라우저 탭 & 구글 검색 파비콘
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, display: 'flex', position: 'relative' }}>
        {/* 뒤 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 2, top: 10,
            width: 17, height: 17,
            borderRadius: 4.5,
            background: 'rgba(42, 96, 73, 0.22)',
          }}
        />
        {/* 앞 팝업 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 12, top: 3,
            width: 17, height: 17,
            borderRadius: 4.5,
            background: '#2A6049',
          }}
        />
      </div>
    ),
    { width: 32, height: 32 }
  )
}
