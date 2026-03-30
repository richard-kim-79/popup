import { notFound } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/UI/Logo'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { daysLeft } from '@/lib/slug'
import type { Block } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

function renderBlock(block: Block) {
  switch (block.type) {
    case 'h1':
      return <h1 key={block.id} className="mb-4 text-4xl font-extrabold leading-snug text-popup-text">{block.content}</h1>
    case 'h2':
      return <h2 key={block.id} className="mb-3 text-2xl font-bold leading-snug text-popup-text">{block.content}</h2>
    case 'text':
      return <p key={block.id} className="mb-2 text-base leading-relaxed text-popup-text">{block.content}</p>
    case 'image':
      if (!block.url) return null
      if (block.url.match(/\.(mp4|mov)$/i))
        return <video key={block.id} src={block.url} controls className="mb-4 w-full rounded-lg" />
      if (block.url.endsWith('.pdf'))
        return <a key={block.id} href={block.url} target="_blank" rel="noreferrer" className="mb-4 flex items-center gap-2 rounded-lg border border-popup-border p-4 text-sm text-popup-accent">📄 PDF 파일 열기</a>
      return <img key={block.id} src={block.url} alt="" className="mb-4 w-full rounded-lg object-cover" />
    case 'button':
      return (
        <a key={block.id} href={block.href ?? '#'} target={block.href ? '_blank' : undefined} rel="noreferrer"
          className="mb-3 inline-block rounded-md bg-popup-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-popup-accent-hover">
          {block.label}
        </a>
      )
    case 'divider':
      return <hr key={block.id} className="my-4 border-popup-border" />
    default:
      return null
  }
}

export default async function ViewerPage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('pages')
    .select('blocks, locked, expires_at, deleted_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) notFound()

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
        {blocks.map(renderBlock)}
      </div>

      {/* Footer */}
      <div className="border-t border-popup-border px-6 py-4 text-center">
        <span className="text-xs text-popup-faint">{remaining}일 후 소멸 · </span>
        <Link href="/" className="text-xs text-popup-faint hover:text-popup-muted">Popup으로 만들기</Link>
      </div>
    </div>
  )
}
