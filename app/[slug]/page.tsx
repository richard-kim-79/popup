import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ReportButton from '@/components/ReportButton'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { daysLeft } from '@/lib/slug'
import { extractHtmlMeta } from '@/lib/html-meta'
import type { Block, YoutubeBlock, LinkBlock, ImageWidth } from '@/types'
import SocialEmbed from '@/components/Blocks/SocialEmbed'
import ExpiryUpgradeButton from '@/components/Viewer/ExpiryUpgradeButton'
import ExpireNowButton from '@/components/Viewer/ExpireNowButton'
import LockedBanner from '@/components/Viewer/LockedBanner'
import MadeWithPopup from '@/components/Viewer/MadeWithPopup'

/** URL에서 hostname 안전하게 추출 */
function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

/** HTML 엔티티 서버사이드 디코딩 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
}

const IMG_WIDTH: Record<ImageWidth, string> = {
  small:  'w-1/3',
  medium: 'w-2/3',
  full:   'w-full',
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i

const REPORT_HIDE_THRESHOLD = 3

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = getSupabaseAdmin()
  const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()

  const { data } = await supabase
    .from('pages')
    .select('blocks, locked, expires_at, html_content')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  const isLocked = (data?.locked ?? false) || (data?.expires_at ? new Date(data.expires_at) < new Date() : false)

  // HTML 페이지 — 업로드된 HTML 안의 <title>·og:* 메타 우선 사용
  if (data?.html_content) {
    const meta = extractHtmlMeta(data.html_content)
    const title = meta.title?.trim() || 'HTML 페이지'
    const description = meta.description?.trim() || undefined  // 페이지 자체 설명이 없으면 메타 자체 생략
    const pageUrl = `${BASE}/${slug}`
    // og:image 우선순위: HTML이 명시한 절대 URL > 동적 OG 라우트(자동 fallback)
    // 사용자 HTML에 og:image가 없으면 ${BASE}/${slug}/opengraph-image가 자동 생성됨
    const images = meta.image ? [meta.image] : undefined

    return {
      title,
      ...(description ? { description } : {}),
      robots: isLocked ? { index: false, follow: false } : { index: true, follow: true },
      alternates: { canonical: pageUrl },
      openGraph: {
        title,
        ...(description ? { description } : {}),
        url: pageUrl,
        siteName: 'Popup',
        type: 'website',
        ...(images ? { images } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        ...(description ? { description } : {}),
        ...(images ? { images } : {}),
      },
    }
  }

  const blocks = ((data?.blocks ?? []) as unknown) as Block[]

  // 첫 번째 H1을 제목으로
  const titleBlock = blocks.find((b) => b.type === 'h1' && (b as { content?: string }).content?.trim())
  const rawTitle = titleBlock ? (titleBlock as { content: string }).content.trim() : null
  const title = rawTitle ?? 'Popup 페이지'

  // 첫 번째 text 블록을 설명으로 (없으면 메타 자체에 description 제외)
  const textBlock = blocks.find((b) => b.type === 'text' && (b as { content?: string }).content?.trim())
  const description = textBlock
    ? (textBlock as { content: string }).content.trim().slice(0, 160)
    : undefined

  // OG 이미지 우선순위: 이미지 블록 > YouTube 썸네일 > 기본
  const imageBlock = blocks.find((b) => b.type === 'image' && (b as { url?: string }).url && !(b as { url: string }).url.toLowerCase().endsWith('.pdf'))
  const youtubeBlock = blocks.find((b) => b.type === 'youtube' && (b as { videoId?: string }).videoId)

  let ogImage: string | undefined
  if (imageBlock) {
    ogImage = (imageBlock as { url: string }).url
  } else if (youtubeBlock) {
    ogImage = `https://img.youtube.com/vi/${(youtubeBlock as { videoId: string }).videoId}/maxresdefault.jpg`
  }

  const pageUrl = `${BASE}/${slug}`

  return {
    title,
    ...(description ? { description } : {}),
    // 잠금된 페이지는 검색엔진 색인 제외
    robots: isLocked ? { index: false, follow: false } : { index: true, follow: true },
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: pageUrl,
      siteName: 'Popup',
      type: 'article',
      locale: 'ko_KR',
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

function renderBlock(block: Block) {
  switch (block.type) {
    case 'h1':
      if (!block.content?.trim()) return null
      return (
        <h1
          key={block.id}
          className="mb-4 font-extrabold leading-tight text-popup-text break-words"
          style={{ fontSize: 'clamp(1.375rem, 5vw, 2.25rem)' }}
        >
          {block.content}
        </h1>
      )
    case 'h2':
      if (!block.content?.trim()) return null
      return (
        <h2
          key={block.id}
          className="mb-3 font-bold leading-snug text-popup-text break-words"
          style={{ fontSize: 'clamp(1.125rem, 3.5vw, 1.5rem)' }}
        >
          {block.content}
        </h2>
      )
    case 'text':
      if (block.content === null || block.content === undefined) return null
      if (!block.content.trim()) {
        const newlines = (block.content.match(/\n/g) ?? []).length
        const spacerRem = Math.max(1, newlines) * 1.5
        return <div key={block.id} style={{ height: `${spacerRem}rem` }} aria-hidden="true" />
      }
      return <p key={block.id} className="mb-2 text-base leading-relaxed text-popup-text whitespace-pre-wrap">{block.content}</p>
    case 'image': {
      if (!block.url) return null
      const displayName = block.filename ?? (() => { try { return decodeURIComponent(block.url!.split('/').pop()?.split('?')[0] ?? '파일') } catch { return '파일' } })()

      // ── PDF ──
      if (block.mediaType === 'pdf' || block.url.toLowerCase().endsWith('.pdf')) {
        const w = block.width ?? 'full'
        return (
          <div key={block.id} className={`mb-4 ${IMG_WIDTH[w]}`}>
            <a href={block.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-popup-border bg-popup-white p-4 transition-colors hover:border-popup-muted">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              {w !== 'small' && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-popup-text" title={displayName}>{displayName}</p>
                  {w === 'full' && <p className="mt-0.5 text-xs text-popup-faint">PDF · 클릭해서 열기</p>}
                </div>
              )}
              {w !== 'small' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </a>
          </div>
        )
      }

      // ── 영상 ──
      if (block.mediaType === 'video' || VIDEO_EXT.test(block.url)) {
        return (
          <div key={block.id} className={`mb-4 ${IMG_WIDTH[block.width ?? 'full']}`}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={block.url}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '80vh' }}
            />
          </div>
        )
      }

      // ── 이미지 ──
      return (
        <div key={block.id} className="mb-4">
          <div className={IMG_WIDTH[block.width ?? 'full']}>
            <img src={block.url} alt={displayName} className="w-full rounded-lg object-cover" />
          </div>
        </div>
      )
    }
    case 'button': {
      const btnBg   = block.color ?? '#2E6B52'
      // 밝은 색상이면 어두운 텍스트, 어두운 색상이면 흰 텍스트
      const r = parseInt(btnBg.slice(1, 3), 16)
      const g = parseInt(btnBg.slice(3, 5), 16)
      const b2 = parseInt(btnBg.slice(5, 7), 16)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b2) / 255
      const btnText = luminance > 0.55 ? '#1C1917' : '#FFFFFF'
      return (
        <a key={block.id} href={block.href ?? '#'} target={block.href ? '_blank' : undefined} rel="noreferrer"
          style={{ backgroundColor: btnBg, color: btnText }}
          className="mb-3 inline-block rounded-md px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-85">
          {block.label}
        </a>
      )
    }
    case 'divider':
      return <hr key={block.id} className="my-4 border-popup-border" />
    case 'youtube':
      if (!block.videoId) return null
      return (
        <div key={block.id} className={`mb-4 ${IMG_WIDTH[block.width ?? 'full']}`}>
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${block.videoId}`}
              title="YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      )
    case 'link': {
      if (!block.url) return null

      // SNS 임베드
      if (block.embedType && block.embedId) {
        return (
          <div key={block.id} className="mb-4">
            <SocialEmbed embedType={block.embedType} embedId={block.embedId} url={block.url} />
          </div>
        )
      }

      const lw = block.width ?? 'full'
      const arrowIcon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
          <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
      return (
        <div key={block.id} className={`mb-4 ${IMG_WIDTH[lw]}`}>
          <a href={block.url} target="_blank" rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-popup-border bg-popup-white transition-colors hover:border-popup-muted">
            {/* OG Image — full size only */}
            {lw === 'full' && block.image && (
              <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-popup-bg">
                <img src={block.image} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-3 p-4">
              {block.favicon && <img src={block.favicon} alt="" width={20} height={20} className="shrink-0 rounded" />}
              {/* 소: hostname only */}
              {lw === 'small' && (
                <>
                  <p className="truncate text-xs text-popup-faint">{safeHostname(block.url)}</p>
                  {arrowIcon}
                </>
              )}
              {/* 중: title only */}
              {lw === 'medium' && (
                <>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-popup-text">
                    {decodeHtmlEntities(block.title ?? '')}
                  </p>
                  {arrowIcon}
                </>
              )}
              {/* 대: title + description */}
              {lw === 'full' && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-popup-text">{decodeHtmlEntities(block.title ?? '')}</p>
                    {block.description && <p className="mt-0.5 line-clamp-2 text-xs text-popup-muted">{decodeHtmlEntities(block.description)}</p>}
                  </div>
                  {arrowIcon}
                </>
              )}
            </div>
          </a>
        </div>
      )
    }
    default:
      return null
  }
}

export default async function ViewerPage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()
  const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()

  const { data, error } = await supabase
    .from('pages')
    .select('user_id, blocks, locked, expires_at, deleted_at, report_count, created_at, updated_at, html_content')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) notFound()

  const isHidden = (data.report_count ?? 0) >= REPORT_HIDE_THRESHOLD
  const blocks = (data.blocks as unknown) as Block[]
  const remaining = daysLeft(data.expires_at)
  // DB locked 또는 expires_at 경과 시 잠금 처리 (크론 미실행 방어)
  // 단, 페이지 소유자가 유료 구독자(Lite/Pro)면 만료 면제
  let exempt = false
  if (data.user_id) {
    const { isLifecycleExempt } = await import('@/lib/subscription')
    exempt = await isLifecycleExempt(supabase, data.user_id)
  }
  const isLocked = !exempt && (data.locked || new Date(data.expires_at) < new Date())
  const isHtmlPage = !!data.html_content

  // ── HTML 페이지 — 풀스크린 iframe srcdoc 렌더링 ──────────────
  if (isHtmlPage) {
    if (isLocked) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-popup-bg text-center px-6">
          <div className="text-4xl">🔒</div>
          <p className="text-lg font-semibold text-popup-text">이 페이지의 수명이 다했어요</p>
          <p className="max-w-sm text-sm text-popup-muted">
            30일 수명이 끝나 콘텐츠가 비공개로 전환됐어요.<br />
            연장하면 다시 볼 수 있어요.
          </p>
          <div className="mt-2 flex flex-col items-center gap-2">
            <Link
              href={`/extend?slug=${slug}`}
              className="rounded-lg bg-popup-accent px-6 py-2.5 text-sm font-semibold text-popup-accent-fg hover:bg-popup-accent-hover"
            >
              연장하기 →
            </Link>
            <Link href="/" className="text-xs text-popup-faint hover:text-popup-muted">
              홈으로
            </Link>
            <MadeWithPopup source="expired" variant="cta" />
          </div>
        </div>
      )
    }
    return (
      <div style={{ height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
        <iframe
          srcDoc={data.html_content!}
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="HTML Page"
        />
      </div>
    )
  }

  // JSON-LD 구조화 데이터
  const titleBlock = blocks.find((b) => b.type === 'h1' && (b as { content?: string }).content?.trim())
  const pageTitle = titleBlock ? (titleBlock as { content: string }).content.trim() : 'Popup 페이지'
  const textBlock = blocks.find((b) => b.type === 'text' && (b as { content?: string }).content?.trim())
  const pageDesc = textBlock
    ? (textBlock as { content: string }).content.trim().slice(0, 160)
    : undefined
  const imageBlock = blocks.find((b) => b.type === 'image' && (b as { url?: string }).url && !(b as { url: string }).url.toLowerCase().endsWith('.pdf'))
  const ogImage = imageBlock ? (imageBlock as { url: string }).url : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    ...(pageDesc ? { description: pageDesc } : {}),
    url: `${BASE}/${slug}`,
    ...(ogImage ? { image: ogImage } : {}),
    datePublished: data.created_at ?? undefined,
    dateModified: data.updated_at ?? undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Popup',
      url: BASE,
    },
  }

  return (
    <div className="min-h-screen bg-popup-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Minimal nav */}
      <nav className="flex h-12 items-center justify-between border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-bold text-popup-text">
          Popup
        </Link>
        {isLocked && (
          <span className="rounded bg-popup-warn-bg px-2 py-0.5 text-xs text-popup-warn">🔒 잠금됨</span>
        )}
      </nav>

      {/* Locked banner */}
      {isLocked && <LockedBanner slug={slug} />}

      {/* Content */}
      <div className="mx-auto max-w-[700px] px-6 py-14">
        {isHidden ? (
          <div className="py-20 text-center">
            <p className="mb-2 text-lg font-semibold text-popup-text">이 페이지는 숨김 처리되었습니다</p>
            <p className="text-sm text-popup-muted">커뮤니티 신고로 인해 콘텐츠가 제한되었습니다.</p>
          </div>
        ) : isLocked ? (
          <div className="py-20 text-center">
            <div className="mb-4 text-4xl">🔒</div>
            <p className="mb-2 text-lg font-semibold text-popup-text">이 페이지의 수명이 다했어요</p>
            <p className="mb-6 text-sm text-popup-muted">
              30일 수명이 끝나 콘텐츠가 비공개로 전환됐어요.<br />
              연장하면 다시 볼 수 있어요.
            </p>
            <Link
              href={`/extend?slug=${slug}`}
              className="inline-block rounded-lg bg-popup-accent px-6 py-2.5 text-sm font-semibold text-popup-accent-fg hover:bg-popup-accent-hover"
            >
              연장하기 →
            </Link>
            <div className="mt-4">
              <MadeWithPopup source="expired" variant="cta" />
            </div>
          </div>
        ) : (
          blocks.map(renderBlock)
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-popup-border px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          {isLocked ? (
            <Link href="/" className="text-xs text-popup-faint hover:text-popup-muted">
              홈으로
            </Link>
          ) : (
            <>
              <Link href={`/${slug}/edit`} className="text-xs text-popup-faint hover:text-popup-muted">편집</Link>
              <span className="text-popup-faint">·</span>
              <ExpiryUpgradeButton slug={slug} remaining={remaining} />
              <span className="text-popup-faint">·</span>
              <ReportButton slug={slug} />
              {/* 소유자(localStorage 토큰 보유)에게만 노출 */}
              <ExpireNowButton slug={slug} />
            </>
          )}
        </div>
        {/* 방문자용 바이럴 CTA — 공유받은 사람을 신규 생성으로 (소유자 액션과 분리) */}
        {!isLocked && (
          <div className="mt-2.5">
            <MadeWithPopup source="shared" variant="inline" />
          </div>
        )}
      </div>
    </div>
  )
}
