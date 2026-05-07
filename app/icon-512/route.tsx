import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

/**
 * GET /icon-512
 * 512×512 앱 아이콘 — macOS PWA·앱 클립·공유 시트용
 * 원본 2-카드 디자인을 512px 스케일로 재현
 */
export async function GET(_req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#2A6049',
          display: 'flex',
          position: 'relative',
        }}
      >
        {/* 뒤 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 216,
            width: 216,
            height: 216,
            borderRadius: 54,
            background: 'rgba(255,255,255,0.28)',
          }}
        />
        {/* 앞 팝업 카드 */}
        <div
          style={{
            position: 'absolute',
            left: 216,
            top: 80,
            width: 216,
            height: 216,
            borderRadius: 54,
            background: 'white',
          }}
        />
      </div>
    ),
    { width: 512, height: 512 }
  )
}
