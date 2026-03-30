'use client'

import { useState, useRef, useEffect } from 'react'
import type { BlockType } from '@/types'

const ITEMS: { type: BlockType; icon: string; label: string }[] = [
  { type: 'h1',      icon: 'H1', label: '제목'   },
  { type: 'h2',      icon: 'H2', label: '소제목' },
  { type: 'text',    icon: '¶',  label: '텍스트' },
  { type: 'image',   icon: '▣',  label: '미디어' },
  { type: 'button',  icon: '⊡',  label: '버튼'   },
  { type: 'divider', icon: '—',  label: '구분선' },
]

interface Props {
  onAdd: (type: BlockType) => void
}

export default function BlockAdder({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleAdd = (type: BlockType) => {
    onAdd(type)
    setOpen(false)
  }

  return (
    <div ref={ref} className="mt-5 flex items-center gap-3">
      {/* 단일 + 트리거 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="블록 추가"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm leading-none transition-all ${
          open
            ? 'border-popup-accent bg-popup-accent text-white'
            : 'border-popup-border text-popup-faint hover:border-popup-muted hover:text-popup-muted'
        }`}
      >
        <span className={`transition-transform duration-150 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>

      {/* 닫힌 상태: 구분선 */}
      {!open && <div className="h-px flex-1 bg-popup-border opacity-60" />}

      {/* 열린 상태: 블록 타입 선택 */}
      {open && (
        <div className="flex flex-wrap gap-1.5">
          {ITEMS.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => handleAdd(type)}
              title={label}
              className="flex items-center gap-1.5 rounded-lg border border-popup-border bg-popup-surface px-2.5 py-1.5 text-xs text-popup-muted hover:border-popup-accent hover:bg-popup-accent-bg hover:text-popup-accent-text"
            >
              <span className="font-mono text-[10px] opacity-50">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
