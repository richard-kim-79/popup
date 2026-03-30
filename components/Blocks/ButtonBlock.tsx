'use client'

import { useRef, useEffect, useState } from 'react'
import type { ButtonBlock as ButtonBlockType } from '@/types'

interface Props {
  block: ButtonBlockType
  selected: boolean
  onUpdate: (id: string, patch: Partial<ButtonBlockType>) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onSelect: (id: string) => void
}

export default function ButtonBlock({ block, selected, onUpdate, onDelete, onAddBelow, onSelect }: Props) {
  const labelRef = useRef<HTMLDivElement>(null)
  const [showHref, setShowHref] = useState(false)

  useEffect(() => {
    if (selected && labelRef.current && document.activeElement !== labelRef.current) {
      labelRef.current.focus()
    }
  }, [selected])

  return (
    <div className="group flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2">
        <div
          ref={labelRef}
          contentEditable
          suppressContentEditableWarning
          data-ph="버튼 텍스트"
          className="inline-block min-w-[80px] cursor-text rounded-md bg-popup-accent px-6 py-2.5 text-sm font-medium text-white"
          onInput={(e) => onUpdate(block.id, { label: (e.target as HTMLDivElement).textContent ?? '' })}
          onFocus={() => onSelect(block.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddBelow(block.id) }
          }}
        >
          {block.label}
        </div>
        <button
          onClick={() => setShowHref((v) => !v)}
          title="링크 설정"
          className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-popup-faint opacity-0 transition-opacity hover:bg-popup-surface hover:text-popup-muted group-hover:opacity-100"
        >
          ↗
        </button>
        <button
          onClick={() => onDelete(block.id)}
          aria-label="블록 삭제"
          className="flex h-5 w-5 items-center justify-center rounded text-popup-faint opacity-0 transition-opacity hover:bg-popup-surface hover:text-popup-muted group-hover:opacity-100"
        >
          ×
        </button>
      </div>
      {showHref && (
        <input
          type="url"
          placeholder="https://example.com"
          value={block.href ?? ''}
          onChange={(e) => onUpdate(block.id, { href: e.target.value })}
          className="w-full max-w-sm rounded-md border border-popup-border px-3 py-1.5 text-xs text-popup-text outline-none focus:border-popup-accent"
        />
      )}
    </div>
  )
}
