'use client'

import { useEffect, useRef, Suspense } from 'react'
import { Tweet } from 'react-tweet'
import type { SocialEmbedType } from '@/types'

interface Props {
  embedType: SocialEmbedType
  embedId: string
  url: string
}

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

export default function SocialEmbed({ embedType, embedId, url }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (embedType === 'instagram') {
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process()
        return
      }
      if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
        const script = document.createElement('script')
        script.src = 'https://www.instagram.com/embed.js'
        script.async = true
        document.head.appendChild(script)
      }
    }
  }, [embedType, embedId])

  /* ── Twitter — react-tweet (스크립트 불필요, SSR 지원) ── */
  if (embedType === 'twitter') {
    return (
      <div className="flex justify-center py-2 [&>div]:!max-w-[550px] [&>div]:w-full">
        <Suspense fallback={
          <div className="h-32 w-[550px] max-w-full animate-pulse rounded-2xl bg-popup-border" />
        }>
          <Tweet id={embedId} />
        </Suspense>
      </div>
    )
  }

  /* ── Instagram ── */
  if (embedType === 'instagram') {
    return (
      <div ref={ref} className="flex justify-center py-2">
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{ maxWidth: 540, minWidth: 326, width: 'calc(100% - 2px)' }}
        />
      </div>
    )
  }

  /* ── TikTok ── */
  if (embedType === 'tiktok') {
    return (
      <div className="flex justify-center py-2">
        <iframe
          src={`https://www.tiktok.com/embed/v2/${embedId}`}
          className="rounded-xl border-0"
          style={{ width: 325, height: 700, maxWidth: '100%' }}
          allow="encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        />
      </div>
    )
  }

  return null
}
