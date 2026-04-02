'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import type { ImageBlock as ImageBlockType } from '@/types'
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

  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blocksRef        = useRef<Block[]>(initialBlocks)
  const pendingFilesRef  = useRef<Map<string, File>>(new Map())
  const savingRef        = useRef(false)           // 현재 저장 요청 진행 중 여부
  const pendingBlocksRef = useRef<Block[] | null>(null)  // 저장 중 들어온 최신 blocks

  // ── 핵심 저장 함수 ──────────────────────────────────────────────────
  const save = useCallback(async (newBlocks: Block[]) => {
    // 이미 저장 중이면 pending에 최신 상태 기록 후 리턴
    if (savingRef.current) {
      pendingBlocksRef.current = newBlocks
      return
    }

    savingRef.current = true
    setSaveStatus('saving')

    try {
      const res = await fetch(`/api/pages/${slug}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editToken, blocks: newBlocks }),
      })
      if (res.status === 403) {
        // 토큰 만료 또는 무효 → localStorage 정리 후 재인증
        localStorage.removeItem(`popup_token_${slug}`)
        window.location.reload()
        return
      }
      setSaveStatus(res.ok ? 'saved' : 'error')
    } catch {
      // 네트워크 오류
      setSaveStatus('error')
    } finally {
      savingRef.current = false
      // 저장 중 들어온 pending이 있으면 즉시 재저장
      if (pendingBlocksRef.current) {
        const pending = pendingBlocksRef.current
        pendingBlocksRef.current = null
        save(pending)
      }
    }
  }, [slug, editToken])

  // ── debounce 헬퍼 ───────────────────────────────────────────────────
  const scheduleSave = useCallback((newBlocks: Block[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      save(newBlocks)
    }, 800)
  }, [save])

  // ── 즉시 flush (탭 닫기·숨김 시) ────────────────────────────────────
  const flushNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      fetch(`/api/pages/${slug}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editToken, blocks: blocksRef.current }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [slug, editToken])

  // ── 탭 숨김·닫기 이벤트 ─────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow()
    }
    const handleBeforeUnload = () => flushNow()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handleBeforeUnload)
      flushNow()   // 컴포넌트 언마운트 시 flush
    }
  }, [flushNow])

  // ── 수동 재시도 ──────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    save(blocksRef.current)
  }, [save])

  // ── 블록 CRUD ────────────────────────────────────────────────────────
  const handleUpdate = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => b.id === id ? { ...b, ...patch } : b) as Block[]
      blocksRef.current = next
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((b) => b.id === id)
      const next = prev.filter((b) => b.id !== id)
      blocksRef.current = next
      setSelectedId(next[Math.max(0, idx - 1)]?.id ?? null)
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  const handleAddBelow = useCallback((id: string) => {
    const nb: Block = { id: nanoid(6), type: 'text', content: '' }
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      const next = [...prev]
      next.splice(idx + 1, 0, nb)
      blocksRef.current = next
      scheduleSave(next)
      return next
    })
    setTimeout(() => setSelectedId(nb.id), 0)
  }, [scheduleSave])

  const handleReorder = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks)
    blocksRef.current = newBlocks
    scheduleSave(newBlocks)
  }, [scheduleSave])

  const handleAddImages = useCallback((afterId: string, files: File[]) => {
    const newBlocks: Block[] = files.map(() => ({ id: nanoid(6), type: 'image' } as ImageBlockType))
    files.forEach((file, i) => pendingFilesRef.current.set(newBlocks[i].id, file))
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId)
      const next = [...prev]
      next.splice(idx + 1, 0, ...newBlocks)
      blocksRef.current = next
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

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
      scheduleSave(next)
      return next
    })
    setTimeout(() => setSelectedId(nb.id), 0)
  }, [scheduleSave])

  // ── 저장 상태 UI ─────────────────────────────────────────────────────
  const SaveIndicator = () => {
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1 text-[11px] text-popup-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          저장 중
        </span>
      )
    }
    if (saveStatus === 'error') {
      return (
        <button
          onClick={handleRetry}
          className="flex items-center gap-1 text-[11px] text-red-500 hover:underline"
          title="클릭하여 재시도"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          저장 실패 — 재시도
        </button>
      )
    }
    return <span className="h-1.5 w-1.5 rounded-full bg-popup-accent/50" title="저장됨" />
  }

  return (
    <div className="min-h-screen bg-popup-bg">

      {/* ── 상단바 ── */}
      <div className="sticky top-0 z-[200] flex h-11 items-center justify-between border-b border-popup-border bg-popup-bg/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <a href="/" className="opacity-60 hover:opacity-100">
            <Logo size={16} />
          </a>
          <SaveIndicator />
        </div>

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
          onReorder={handleReorder}
          onAddFilesBelow={handleAddImages}
          pendingFiles={pendingFilesRef.current}
        />

        {!locked && <BlockAdder onAdd={handleAdd} />}

        {/* 페이지 하단 여백 */}
        <div className="mt-16 flex justify-end">
          <span className="text-xs text-popup-faint">{daysLeft}일 남음</span>
        </div>
      </div>

      {showShare   && <ShareModal   slug={slug} onClose={() => setShowShare(false)}   />}
      {showUpgrade && <UpgradeModal slug={slug} onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
