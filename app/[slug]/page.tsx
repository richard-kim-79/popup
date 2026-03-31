import { notFound } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/UI/Logo'
import ReportButton from '@/components/ReportButton'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { daysLeft } from '@/lib/slug'
import type { Block, YoutubeBlock, LinkBlock, ImageWidth } from '@/types'

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

const REPORT_HIDE_THRESHOLD = 3

interface Props {
  params: Promise<{ slug: string }>
}

function renderBlock(block: Block) {
  switch (block.type) {
    case 'h1':
      if (!block.content?.trim()) return null
      return <h1 key={block.id} className="mb-4 text-4xl font-extrabold leading-snug text-popup-text">{block.content}</h1>
    case 'h2':
      if (!block.content?.trim()) return null
      return <h2 key={block.id} className="mb-3 text-2xl font-bold leading-snug text-popup-text">{block.content}</h2>
    case 'text':
      if (!block.content?.trim()) return null
      return <p key={block.id} className="mb-2 text-base leading-relaxed text-popup-text">{block.content}</p>
    case 'image': {
      if (!block.url) return null
      const displayName = block.filename ?? (() => { try { return decodeURIComponent(block.url!.split('/').pop()?.split('?')[0] ?? '파일') } catch { return '파일' } })()
      if (block.url.match(/\.(mp4|mov)$/i))
        return (
          <div key={block.id} className={`mb-4 ${IMG_WIDTH[block.width ?? 'full']}`}>
            <video src={block.url} controls className="w-full rounded-lg" />
            <p className="mt-1 truncate text-xs text-popup-faint" title={displayName}>{displayName}</p>
          </div>
        )
      if (block.url.toLowerCase().endsWith('.pdf'))
        return (
          <div key={block.id} className={`mb-4 ${IMG_WIDTH[block.width ?? 'full']}`}>
            <a href={block.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-popup-border bg-popup-white p-4 transition-colors hover:border-popup-muted">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-popup-text" title={displayName}>{displayName}</p>
                <p className="mt-0.5 text-xs text-popup-faint">PDF · 클릭해서 열기</p>
              </div>
            </a>
          </div>
        )
      return (
        <div key={block.id} className="mb-4">
          <div className={IMG_WIDTH[block.width ?? 'full']}>
            <img src={block.url} alt={displayName} className="w-full rounded-lg object-cover" />
          </div>
          {block.filename && <p className="mt-1 truncate text-xs text-popup-faint" title={displayName}>{displayName}</p>}
        </div>
      )
    }
    case 'button':
      return (
        <a key={block.id} href={block.href ?? '#'} target={block.href ? '_blank' : undefined} rel="noreferrer"
          className="mb-3 inline-block rounded-md bg-popup-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-popup-accent-hover">
          {block.label}
        </a>
      )
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
    case 'link':
      if (!block.url) return null
      return (
        <div key={block.id} className={`mb-4 ${IMG_WIDTH[block.width ?? 'full']}`}>
          <a href={block.url} target="_blank" rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-popup-border bg-popup-white transition-colors hover:border-popup-muted">
            {block.image && (
              <div className="aspect-[1.91/1] w-full overflow-hidden bg-popup-bg">
                <img src={block.image} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-3 p-4">
              {block.favicon && <img src={block.favicon} alt="" width={20} height={20} className="shrink-0 rounded" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-popup-text">{decodeHtmlEntities(block.title ?? '')}</p>
                {block.description && <p className="mt-0.5 line-clamp-2 text-xs text-popup-muted">{decodeHtmlEntities(block.description)}</p>}
                <p className="mt-1 truncate text-xs text-popup-faint">{new URL(block.url).hostname}</p>
              </div>
            </div>
          </a>
        </div>
      )
    default:
      return null
  }
}

export default async function ViewerPage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('pages')
    .select('blocks, locked, expires_at, deleted_at, report_count')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) notFound()

  const isHidden = (data.report_count ?? 0) >= REPORT_HIDE_THRESHOLD
  const blocks = (data.blocks as unknown) as Block[]
  const remaining = daysLeft(data.expires_at)

  return (
    <div className="min-h-screen bg-popup-white">
      {/* Minimal nav */}
      <nav className="flex h-12 items-center justify-between border-b border-popup-border px-6">
        <Link href="/" className="flex items-center gap-1.5">
          <Logo size={18} />
          <span className="text-sm font-bold text-popup-text">Popup</span>
        </Link>
        <div className="flex items-center gap-3">
          {data.locked && (
            <span className="rounded bg-popup-warn-bg px-2 py-0.5 text-xs text-popup-warn">🔒 잠금됨</span>
          )}
          <Link href={`/${slug}/edit`} className="text-xs text-popup-muted hover:text-popup-text">
            편집
          </Link>
        </div>
      </nav>

      {/* Locked banner */}
      {data.locked && (
        <div className="border-b border-popup-warn-border bg-popup-warn-bg px-6 py-3 text-center text-sm text-popup-warn">
          이 페이지는 잠겨있습니다.{' '}
          <Link href={`/${slug}/edit`} className="font-medium underline">잠금 해제하기</Link>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-[700px] px-6 py-14">
        {isHidden ? (
          <div className="py-20 text-center">
            <p className="mb-2 text-lg font-semibold text-popup-text">이 페이지는 숨김 처리되었습니다</p>
            <p className="text-sm text-popup-muted">커뮤니티 신고로 인해 콘텐츠가 제한되었습니다.</p>
          </div>
        ) : (
          blocks.map(renderBlock)
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-popup-border px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs text-popup-faint">{remaining}일 후 소멸</span>
          <span className="text-popup-faint">·</span>
          <ReportButton slug={slug} />
          <span className="text-popup-faint">·</span>
          <Link href="/" className="text-xs text-popup-faint hover:text-popup-muted">Popup으로 만들기</Link>
        </div>
      </div>
    </div>
  )
}
