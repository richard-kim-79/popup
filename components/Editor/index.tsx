'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import type { ImageBlock as ImageBlockType } from '@/types'
import BlockList from './BlockList'
import BlockAdder from './BlockAdder'
import LockBanner from './LockBanner'
import ShareModal from '@/components/Modal/ShareModal'
import UpgradeModal from '@/components/Modal/UpgradeModal'
import type { Block, BlockType } from '@/types'

const ACCEPTED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
])

const HISTORY_LIMIT = 50

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
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const debounceRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blocksRef          = useRef<Block[]>(initialBlocks)
  const pendingFilesRef    = useRef<Map<string, File>>(new Map())
  const savingRef          = useRef(false)
  const pendingBlocksRef   = useRef<Block[] | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // ── 히스토리 (undo/redo) ─────────────────────────────────────────────
  const historyRef        = useRef<Block[][]>([initialBlocks])
  const historyIndexRef   = useRef<number>(0)
  const historyDebounce   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  /** 히스토리 스냅샷 추가 (즉시) */
  const pushHistory = useCallback((newBlocks: Block[]) => {
    const sliced = historyRef.current.slice(0, historyIndexRef.current + 1)
    sliced.push(newBlocks)
    if (sliced.length > HISTORY_LIMIT) sliced.shift()
    historyRef.current = sliced
    historyIndexRef.current = sliced.length - 1
    syncHistoryState()
  }, [syncHistoryState])

  /** 텍스트 입력용 디바운스 히스토리 (300ms) */
  const pushHistoryDebounced = useCallback((newBlocks: Block[]) => {
    if (historyDebounce.current) clearTimeout(historyDebounce.current)
    historyDebounce.current = setTimeout(() => {
      historyDebounce.current = null
      pushHistory(newBlocks)
    }, 300)
  }, [pushHistory])

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
      pushHistoryDebounced(next)   // 텍스트 입력은 300ms 디바운스 후 스냅샷
      return next
    })
  }, [scheduleSave, pushHistoryDebounced])

  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((b) => b.id === id)
      const next = prev.filter((b) => b.id !== id)
      blocksRef.current = next
      setSelectedId(next[Math.max(0, idx - 1)]?.id ?? null)
      scheduleSave(next)
      pushHistory(next)            // 삭제는 즉시 스냅샷
      return next
    })
  }, [scheduleSave, pushHistory])

  const handleAddBelow = useCallback((id: string) => {
    const nb: Block = { id: nanoid(6), type: 'text', content: '' }
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      const next = [...prev]
      next.splice(idx + 1, 0, nb)
      blocksRef.current = next
      scheduleSave(next)
      pushHistory(next)            // 추가는 즉시 스냅샷
      return next
    })
    setTimeout(() => setSelectedId(nb.id), 0)
  }, [scheduleSave, pushHistory])

  const handleReorder = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks)
    blocksRef.current = newBlocks
    scheduleSave(newBlocks)
    pushHistory(newBlocks)         // 순서 변경은 즉시 스냅샷
  }, [scheduleSave, pushHistory])

  const handleAddImages = useCallback((afterId: string, files: File[]) => {
    const newBlocks: Block[] = files.map(() => ({ id: nanoid(6), type: 'image' } as ImageBlockType))
    files.forEach((file, i) => pendingFilesRef.current.set(newBlocks[i].id, file))
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId)
      const next = [...prev]
      next.splice(idx + 1, 0, ...newBlocks)
      blocksRef.current = next
      scheduleSave(next)
      pushHistory(next)            // 이미지 추가는 즉시 스냅샷
      return next
    })
  }, [scheduleSave, pushHistory])

  const handleAdd = useCallback((type: BlockType) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      h1: { content: '' }, h2: { content: '' }, text: { content: '' },
      image: {}, button: { label: '클릭하세요', color: sessionStorage.getItem('popup-accent-color') ?? '#2E6B52' }, divider: {},
      youtube: {}, link: {},
    }
    const nb = { id: nanoid(6), type, ...defaults[type] } as Block
    setBlocks((prev) => {
      const next = [...prev, nb]
      blocksRef.current = next
      scheduleSave(next)
      pushHistory(next)            // 블록 추가는 즉시 스냅샷
      return next
    })
    setTimeout(() => setSelectedId(nb.id), 0)
  }, [scheduleSave, pushHistory])

  // ── Undo / Redo ───────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const restored = historyRef.current[historyIndexRef.current]
    setBlocks(restored)
    blocksRef.current = restored
    scheduleSave(restored)
    syncHistoryState()
  }, [scheduleSave, syncHistoryState])

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const restored = historyRef.current[historyIndexRef.current]
    setBlocks(restored)
    blocksRef.current = restored
    scheduleSave(restored)
    syncHistoryState()
  }, [scheduleSave, syncHistoryState])

  // ── 키보드 단축키 (Cmd+Z / Cmd+Shift+Z) ────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

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

  // ── 전역 드래그&드롭 (window 레벨) ─────────────────────────────────
  // React 합성 이벤트 대신 window 이벤트를 사용해 자식 요소 진입/이탈 문제 완전 차단
  useEffect(() => {
    if (locked) return

    const onWindowDragEnter = (e: globalThis.DragEvent) => {
      // 외부 파일 드래그만 감지 (브라우저 내부 텍스트 등 제외)
      if (e.dataTransfer?.types.includes('Files')) setIsDragOver(true)
    }

    const onWindowDragLeave = (e: globalThis.DragEvent) => {
      // relatedTarget이 null이면 브라우저 창 밖으로 완전히 벗어난 것
      if (e.relatedTarget === null) setIsDragOver(false)
    }

    const onWindowDragOver = (e: globalThis.DragEvent) => {
      // 브라우저 기본 동작(파일 열기) 방지
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const onWindowDrop = (e: globalThis.DragEvent) => {
      // 오버레이 밖에 드롭 시 브라우저 기본 동작 방지 + 오버레이 숨김
      e.preventDefault()
      setIsDragOver(false)
    }

    window.addEventListener('dragenter', onWindowDragEnter)
    window.addEventListener('dragleave', onWindowDragLeave)
    window.addEventListener('dragover', onWindowDragOver)
    window.addEventListener('drop', onWindowDrop)

    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter)
      window.removeEventListener('dragleave', onWindowDragLeave)
      window.removeEventListener('dragover', onWindowDragOver)
      window.removeEventListener('drop', onWindowDrop)
    }
  }, [locked])

  // 오버레이에서 드롭 처리
  const handleOverlayDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter((f) => ACCEPTED_MIME.has(f.type))
    if (files.length === 0) return

    // 기존 빈 이미지 블록(url 없음)을 먼저 채움 → 새 블록 생성 없이 그 자리에서 업로드
    const emptyImageBlocks = blocksRef.current.filter(
      (b): b is ImageBlockType => b.type === 'image' && !(b as ImageBlockType).url
    )

    const filesToFill = files.slice(0, emptyImageBlocks.length)
    const filesToAdd  = files.slice(emptyImageBlocks.length)

    if (filesToFill.length > 0) {
      // pendingFilesRef에 할당 후 리렌더 → ImageBlock이 새 initialFile 수신 → 업로드 시작
      filesToFill.forEach((file, i) => {
        pendingFilesRef.current.set(emptyImageBlocks[i].id, file)
      })
      setBlocks((prev) => [...prev])  // 리렌더 트리거 (데이터 변경 없음)
    }

    // 빈 블록보다 파일이 더 많으면 새 블록 추가
    if (filesToAdd.length > 0) {
      const lastId = blocksRef.current.at(-1)?.id ?? ''
      handleAddImages(lastId, filesToAdd)
    }
  }, [handleAddImages])

  return (
    <div className="relative min-h-screen bg-popup-bg">

      {/* ── 상단바 ── */}
      <div className="sticky top-0 z-[200] flex h-11 items-center justify-between border-b border-popup-border bg-popup-bg/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <a href="/" className="text-sm font-semibold tracking-tight text-popup-text opacity-60 hover:opacity-100">
            Popup
          </a>
          <SaveIndicator />
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo 버튼 */}
          <div className="flex items-center">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="실행 취소 (⌘Z)"
              className="rounded-md p-1.5 text-popup-muted hover:bg-popup-border hover:text-popup-text disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14 4 9l5-5"/>
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="다시 실행 (⌘⇧Z)"
              className="rounded-md p-1.5 text-popup-muted hover:bg-popup-border hover:text-popup-text disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 14 5-5-5-5"/>
                <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>
              </svg>
            </button>
          </div>

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
            className="rounded-lg bg-popup-accent px-3.5 py-1.5 text-xs font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
          >
            공유
          </button>
        </div>
      </div>

      {/* ── 드래그 오버레이 (pointer-events: all → 드롭 직접 수신) ── */}
      {isDragOver && !locked && (
        <div
          className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-popup-accent/10 backdrop-blur-[2px]"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={handleOverlayDrop}
        >
          <div className="rounded-2xl border-2 border-dashed border-popup-accent bg-popup-white/90 px-12 py-10 text-center shadow-lg">
            <div className="mb-2 text-4xl">📎</div>
            <p className="text-base font-semibold text-popup-accent">파일을 여기에 놓으세요</p>
            <p className="mt-1 text-xs text-popup-muted">이미지(JPG·PNG·GIF·WebP) · PDF</p>
          </div>
        </div>
      )}

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
