'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Editor from '@/components/Editor'
import ShareModal from '@/components/Modal/ShareModal'
import type { Block } from '@/types'

interface PageData {
  blocks: Block[]
  htmlContent?: string | null
  pdfUrl?: string | null
  locked: boolean
  daysLeft: number
}

export default function EditPage() {
  const { slug } = useParams<{ slug: string }>()
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [editToken, setEditToken] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/pages/${slug}`)
      if (!res.ok) { setError('페이지를 찾을 수 없습니다.'); setLoading(false); return }
      const data = await res.json()
      setPageData({ blocks: data.blocks, htmlContent: data.htmlContent ?? null, pdfUrl: data.pdfUrl ?? null, locked: data.locked, daysLeft: data.daysLeft })

      const stored = localStorage.getItem(`popup_token_${slug}`)
      if (stored) {
        setEditToken(stored)
      } else {
        // 만든 브라우저 토큰이 없으면 — 로그인 소유자면 토큰 발급, 아니면 편집 불가
        const ot = await fetch(`/api/pages/${slug}/owner-token`, { method: 'POST' })
        if (ot.ok) {
          const { editToken: t } = await ot.json() as { editToken: string }
          localStorage.setItem(`popup_token_${slug}`, t)
          setEditToken(t)
        } else {
          setError('이 페이지를 편집할 권한이 없어요. 만든 기기(브라우저)에서 열거나, 소유자라면 로그인 후 다시 시도하세요.')
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center text-sm text-popup-muted">
      불러오는 중...
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="text-popup-muted">{error}</p>
      <a href="/" className="text-sm text-popup-accent underline">홈으로</a>
    </div>
  )

  if (pageData?.htmlContent || pageData?.pdfUrl) return (
    <>
      {showShare && <ShareModal slug={slug} onClose={() => setShowShare(false)} />}
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="text-3xl">📄</div>
        <p className="text-sm text-popup-muted">{pageData?.pdfUrl ? 'PDF' : 'HTML'} 페이지는 블록 에디터로 편집할 수 없습니다.</p>
        <div className="flex gap-3">
          <a
            href={`/${slug}`}
            className="rounded-xl border border-popup-border px-5 py-2.5 text-sm text-popup-text hover:bg-popup-surface transition-colors"
          >
            페이지 보기 →
          </a>
          <button
            onClick={() => setShowShare(true)}
            className="rounded-xl bg-popup-accent px-5 py-2.5 text-sm font-medium text-popup-accent-fg hover:bg-popup-accent-hover transition-colors"
          >
            공유하기
          </button>
        </div>
      </div>
    </>
  )

  if (!editToken || !pageData) return null

  return (
    <Editor
      slug={slug}
      editToken={editToken}
      initialBlocks={pageData.blocks}
      daysLeft={pageData.daysLeft}
      locked={pageData.locked}
    />
  )
}
