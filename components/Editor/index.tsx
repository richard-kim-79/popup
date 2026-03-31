'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import Logo from '@/components/UI/Logo'
import BlockList from './BlockList'
import BlockAdder from './BlockAdder'
import LockBanner from './LockBanner'
import ShareModal from '@/components/Modal/ShareModal'
import UpgradeModal from '@/components/Modal/UpgradeModal'
import type { Block, BlockType } from '@/types'

interface Props {
  slug: string
  editToken: string
  initialBlocks: Block[]
  daysLeft: number
  locked: boolean
}

type SaveStatus = 'saved' | 'saving' | 'error'

export default function Editor({ slug, editToken, initialBlocks, daysLeft, locked }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showBanner, setShowBanner] = useState(daysLeft <= 7 && !locked)
  const [showShare, setShowShare] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blocksRef   = useRef<Block[]>(initialBlocks)   // 최신 blocks를 ref로 추적

  const save = useCallback(async (newBlocks: Block[]) => {
    setSaveStatus('saving')
    const res = await fetch(`/api/pages/${slug}/blocks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editToken, blocks: newBlocks }),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
  }, [slug, editToken])

  const handleUpdate = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => b.id === id ? { ...b, ...patch } : b) as Block[]
      blocksRef.current = next
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(next), 300)
      return next
    })
  }, [save])

  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((b) => b.id === id)
      const next = prev.filter((b) => b.id !== id)
      blocksRef.current = next
      setSelectedId(next[Math.max(0, idx - 1)]?.id ?? null)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(next), 300)
      return next
    })
  }, [save])

  const handleAddBelow = useCallback((id: string) => {
    const nb: Block = { id: nanoid(6), type: 'text', content: '' }
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      const next = [...prev]
      next.splice(idx + 1, 0, nb)
      blocksRef.current = next
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(next), 300)
      return next
    })
    setTimeout(() => setSelectedId(nb.id), 0)
  }, [save])

  const handleAdd = useCallback((type: BlockType) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      h1: { content: '' }, h2: { content: '' }, text: { content: '' },
      image: {}, button: { label: '클릭하세요' }, divider: {},
      youtube: {}, link: {},
    }
    const nb = { id: nanoid(6), type, ...defaults[type] } as Block
    setBlocks((prev) => {
      const next = [...prev, nb]
      blocksRef.current = next
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => save(next), 300)
      return next
    })
    setTimeout(() => setSelectedId(nb.id), 0)
  }, [save])

  // 언마운트 시: pending debounce가 있으면 즉시 flush (keepalive로 안전하게 전송)
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        fetch(`/api/pages/${slug}/blocks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editToken, blocks: blocksRef.current }),
          keepalive: true,
        }).catch(() => {})
      }
    }
  }, [slug, editToken])

  // 저장 상태 도트 색상
  const dotColor =
    saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' :
    saveStatus === 'error'  ? 'bg-red-400' :
    'bg-popup-accent/50'

  return (
    <div className="min-h-screen bg-popup-bg">

      {/* ── 상단바: 미니멀 ── */}
      <div className="sticky top-0 z-[200] flex h-11 items-center justify-between border-b border-popup-border bg-popup-bg/95 px-4 backdrop-blur-sm">
        {/* 왼쪽: 로고 + slug */}
        <div className="flex items-center gap-2.5">
          <a href="/" className="opacity-60 hover:opacity-100">
            <Logo size={16} />
          </a>
          {/* 저장 상태 도트 */}
          <span title={saveStatus === 'saving' ? '저장 중' : saveStatus === 'error' ? '저장 실패' : '저장됨'}
            className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        </div>

        {/* 오른쪽: 공유 버튼 하나만 */}
        <div className="flex items-center gap-2">
          {locked && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="rounded-md px-3 py-1 text-xs font-medium text-popup-warn hover:bg-popup-warn-bg"
            >
              잠금 해제
            </button>
          )}
          <button
            onClick={() => setShowShare(true)}
            className="rounded-lg bg-popup-accent px-3.5 py-1.5 text-xs font-medium text-white hover:bg-popup-accent-hover"
          >
            공유
          </button>
        </div>
      </div>

      {/* ── 잠금/경고 배너 ── */}
      {!locked && showBanner && (
        <LockBanner
          daysLeft={daysLeft}
          onUpgrade={() => setShowUpgrade(true)}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* ── 에디터 본문 ── */}
      <div className="mx-auto max-w-[660px] px-6 pb-40 pt-12">
        <BlockList
          blocks={blocks}
          slug={slug}
          editToken={editToken}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAddBelow={handleAddBelow}
        />

        {!locked && <BlockAdder onAdd={handleAdd} />}

        {/* 페이지 링크 푸터 */}
        <div className="mt-16 flex items-center justify-between">
          <span className="font-mono text-xs text-popup-faint">
            {process.env.NEXT_PUBLIC_BASE_URL ?? 'popup.page'}/{slug}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-popup-faint">{daysLeft}일 남음</span>
          </div>
        </div>
      </div>

      {showShare   && <ShareModal   slug={slug} onClose={() => setShowShare(false)}   />}
      {showUpgrade && <UpgradeModal slug={slug} onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
