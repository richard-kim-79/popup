import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

/**
 * GET /icon-512
 * 512×512 고화질 앱 아이콘 — macOS PWA·앱 클립·공유 시트용
 */
export async function GET(_req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
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
            top: 0, left: 0, right: 0, height: 260,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)',
          }}
        />

        {/* 카드 3 — 가장 뒤 */}
        <div
          style={{
            position: 'absolute',
            left: 56, top: 206,
            width: 250, height: 250,
            borderRadius: 52,
            background: 'rgba(255,255,255,0.14)',
            border: '2px solid rgba(255,255,255,0.09)',
          }}
        />

        {/* 카드 2 — 중간 */}
        <div
          style={{
            position: 'absolute',
            left: 131, top: 131,
            width: 250, height: 250,
            borderRadius: 52,
            background: 'rgba(255,255,255,0.30)',
            border: '2px solid rgba(255,255,255,0.16)',
          }}
        />

        {/* 카드 1 — 앞 (팝업) */}
        <div
          style={{
            position: 'absolute',
            left: 206, top: 56,
            width: 250, height: 250,
            borderRadius: 52,
            background: 'white',
            boxShadow: '0 20px 60px rgba(0,0,0,0.30)',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 36px',
            gap: 0,
          }}
        >
          {/* 헤더 이미지 플레이스홀더 */}
          <div
            style={{
              width: '100%', height: 72,
              background: 'linear-gradient(135deg, #EDF5F1 0%, #D6EBE2 100%)',
              borderRadius: 16,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* 이미지 아이콘 */}
            <div style={{
              width: 28, height: 20,
              background: 'rgba(42,96,73,0.20)',
              borderRadius: 5,
              position: 'relative',
              display: 'flex',
            }} />
          </div>

          {/* 제목 바 */}
          <div style={{ width: '68%', height: 20, background: '#2A6049', borderRadius: 8, opacity: 0.85, marginBottom: 16 }} />
          {/* 텍스트 라인 */}
          <div style={{ width: '94%', height: 12, background: '#E2DFDA', borderRadius: 5, marginBottom: 10 }} />
          <div style={{ width: '85%', height: 12, background: '#E2DFDA', borderRadius: 5, marginBottom: 10 }} />
          <div style={{ width: '60%', height: 12, background: '#E2DFDA', borderRadius: 5 }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
