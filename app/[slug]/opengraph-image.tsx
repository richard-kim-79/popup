import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { extractHtmlMeta } from '@/lib/html-meta'
import type { Block } from '@/types'

export const runtime = 'nodejs' // supabase admin은 service_role key 필요
export const alt = 'Popup 페이지'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ slug: string }>
}

/** 페이지별 동적 OG 이미지 — 제목 + 태그라인 */
export default async function PageOgImage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('pages')
    .select('blocks, html_content')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  // 제목 추출: HTML 페이지면 <title>/og:title, 블록 페이지면 H1
  let title = 'Popup 페이지'
  let subtitle = '30초 만에 만들고 링크로 공유'

  if (data?.html_content) {
    const meta = extractHtmlMeta(data.html_content)
    if (meta.title) title = meta.title.slice(0, 60)
    if (meta.description) subtitle = meta.description.slice(0, 80)
  } else if (data?.blocks) {
    const blocks = (data.blocks as unknown as Block[]) ?? []
    const h1 = blocks.find((b) => b.type === 'h1' && (b as { content?: string }).content?.trim())
    if (h1) title = ((h1 as { content: string }).content).trim().slice(0, 60)
    const text = blocks.find((b) => b.type === 'text' && (b as { content?: string }).content?.trim())
    if (text) subtitle = ((text as { content: string }).content).trim().slice(0, 80)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '90px 100px',
          background: '#F7F5F0',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 로고 마크 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 50 }}>
          <div style={{ position: 'relative', width: 48, height: 48, display: 'flex' }}>
            <div style={{ position: 'absolute', left: 0, top: 14, width: 30, height: 30, borderRadius: 8, background: 'rgba(42, 96, 73, 0.22)' }} />
            <div style={{ position: 'absolute', left: 18, top: 0, width: 30, height: 30, borderRadius: 8, background: '#2A6049' }} />
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#1A1812', display: 'flex' }}>Popup</span>
        </div>

        {/* 제목 */}
        <div
          style={{
            fontSize: title.length > 30 ? 64 : 84,
            fontWeight: 800,
            color: '#1A1812',
            letterSpacing: '-1.5px',
            lineHeight: 1.15,
            marginBottom: 32,
            display: 'flex',
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        {/* 부제 */}
        <div
          style={{
            fontSize: 30,
            color: '#A09D92',
            lineHeight: 1.4,
            display: 'flex',
            maxWidth: 1000,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  )
}
