'use client'

import { useRef, useState, useEffect } from 'react'
import type { YoutubeBlock as YoutubeBlockType } from '@/types'

interface Props {
  block: YoutubeBlockType
  onUpdate: (id: string, patch: Partial<YoutubeBlockType>) => void
  onDelete: (id: string) => void
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default function YoutubeBlock({ block, onUpdate, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputUrl, setInputUrl] = useState(block.url ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!block.videoId && inputRef.current) inputRef.current.focus()
  }, [block.videoId])

  const handleSubmit = () => {
    const vid = extractVideoId(inputUrl)
    if (vid) {
      setError('')
      onUpdate(block.id, { url: inputUrl, videoId: vid })
    } else {
      setError('올바른 YouTube 링크를 입력해주세요.')
    }
  }

  if (block.videoId) {
    return (
      <div className="group relative">
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.videoId}`}
            title="YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <button
          onClick={() => onDelete(block.id)}
          className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="group relative rounded-lg border-2 border-dashed border-popup-border bg-popup-surface px-4 py-6 text-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 opacity-30">
        <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 8.5v7l5.5-3.5L10 8.5z" fill="currentColor" />
      </svg>
      <div className="mx-auto flex max-w-xs items-center gap-2">
        <input
          ref={inputRef}
          type="url"
          placeholder="YouTube 링크 붙여넣기"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          className="flex-1 rounded-lg border border-popup-border bg-popup-white px-3 py-2 text-xs text-popup-text outline-none focus:border-popup-accent"
        />
        <button
          onClick={handleSubmit}
          className="shrink-0 rounded-lg bg-popup-accent px-3 py-2 text-xs font-medium text-white hover:bg-popup-accent-hover"
        >
          삽입
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
