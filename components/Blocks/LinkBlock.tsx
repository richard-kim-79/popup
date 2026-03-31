'use client'

import { useRef, useState, useEffect } from 'react'
import type { LinkBlock as LinkBlockType } from '@/types'

interface Props {
  block: LinkBlockType
  onUpdate: (id: string, patch: Partial<LinkBlockType>) => void
  onDelete: (id: string) => void
}

/** 브라우저 textarea를 이용한 HTML 엔티티 디코딩 (클라이언트 전용) */
function decodeEntities(str: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

export default function LinkBlock({ block, onUpdate, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputUrl, setInputUrl] = useState(block.url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!block.url && inputRef.current) inputRef.current.focus()
  }, [block.url])

  const handleSubmit = async () => {
    const trimmed = inputUrl.trim()
    if (!trimmed) return

    let url = trimmed
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url

    try {
      new URL(url)
    } catch {
      setError('올바른 URL을 입력해주세요.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const meta = await res.json() as { title?: string; description?: string; favicon?: string; image?: string }
        onUpdate(block.id, {
          url,
          title: meta.title || new URL(url).hostname,
          description: meta.description || '',
          favicon: meta.favicon || '',
          image: meta.image || '',
        })
      } else {
        onUpdate(block.id, {
          url,
          title: new URL(url).hostname,
          description: '',
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
          image: '',
        })
      }
    } catch {
      onUpdate(block.id, {
        url,
        title: new URL(url).hostname,
        description: '',
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
        image: '',
      })
    } finally {
      setLoading(false)
    }
  }

  // Rendered preview card
  if (block.url && block.title) {
    const hasImage = !!block.image

    return (
      <div className="group relative">
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-popup-border bg-popup-white transition-colors hover:border-popup-muted"
        >
          {/* OG Image */}
          {hasImage && (
            <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-popup-bg">
              <img
                src={block.image}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
          {/* Text content */}
          <div className="flex items-center gap-3 p-4">
            {block.favicon && (
              <img
                src={block.favicon}
                alt=""
                width={20}
                height={20}
                className="shrink-0 rounded"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-popup-text">
                {decodeEntities(block.title ?? '')}
              </p>
              {block.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-popup-muted">
                  {decodeEntities(block.description)}
                </p>
              )}
              <p className="mt-1 truncate text-xs text-popup-faint">
                {new URL(block.url).hostname}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </a>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(block.id) }}
          className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          ×
        </button>
      </div>
    )
  }

  // Input state
  return (
    <div className="group relative rounded-lg border-2 border-dashed border-popup-border bg-popup-surface px-4 py-6 text-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 opacity-30">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mx-auto flex max-w-xs items-center gap-2">
        <input
          ref={inputRef}
          type="url"
          placeholder="URL 붙여넣기 (블로그, SNS 등)"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          className="flex-1 rounded-lg border border-popup-border bg-popup-white px-3 py-2 text-xs text-popup-text outline-none focus:border-popup-accent"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="shrink-0 rounded-lg bg-popup-accent px-3 py-2 text-xs font-medium text-white hover:bg-popup-accent-hover disabled:opacity-40"
        >
          {loading ? '...' : '삽입'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <button
        onClick={() => onDelete(block.id)}
        className="absolute right-2 top-2 text-xs text-popup-faint opacity-0 transition-opacity group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}
