'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Editor from '@/components/Editor'
import PinModal from '@/components/Modal/PinModal'
import type { Block } from '@/types'

interface PageData {
  blocks: Block[]
  locked: boolean
  daysLeft: number
}

export default function EditPage() {
  const { slug } = useParams<{ slug: string }>()
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [editToken, setEditToken] = useState<string | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/pages/${slug}`)
      if (!res.ok) { setError('페이지를 찾을 수 없습니다.'); setLoading(false); return }
      const data = await res.json()
      setPageData({ blocks: data.blocks, locked: data.locked, daysLeft: data.daysLeft })

      const stored = localStorage.getItem(`popup_token_${slug}`)
      if (stored) { setEditToken(stored) }
      else { setShowPin(true) }
      setLoading(false)
    }
    load()
  }, [slug])

  const handlePinConfirm = (token: string) => {
    localStorage.setItem(`popup_token_${slug}`, token)
    setEditToken(token)
    setShowPin(false)
  }

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

  if (!editToken || !pageData) return (
    <>
      {showPin && (
        <PinModal
          mode="enter"
          slug={slug}
          onConfirm={handlePinConfirm}
          onClose={() => { window.location.href = `/${slug}` }}
        />
      )}
    </>
  )

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
