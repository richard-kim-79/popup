'use client'

import { useEffect, useRef } from 'react'
import type { SocialEmbedType } from '@/types'

interface Props {
  embedType: SocialEmbedType
  embedId: string
  url: string
}

declare global {
  interface Window {
    twttr?: { widgets: { load: (el: HTMLElement | null) => void } }
    instgrm?: { Embeds: { process: () => void } }
  }
}

export default function SocialEmbed({ embedType, embedId, url }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (embedType === 'twitter') {
      if (window.twttr?.widgets) {
        window.twttr.widgets.load(ref.current)
        return
      }
      if (!document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
        const script = document.createElement('script')
        script.src = 'https://platform.twitter.com/widgets.js'
        script.async = true
        document.head.appendChild(script)
      }
    }

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

  if (embedType === 'twitter') {
    return (
      <div ref={ref} className="flex justify-center py-2">
        <blockquote className="twitter-tweet" data-dnt="true" data-lang="ko">
          <a href={url} />
        </blockquote>
      </div>
    )
  }

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
