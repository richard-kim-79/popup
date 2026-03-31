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
  const [hovered, setHovered] = useState(false)

  // 초기 마운트 시 한 번만 label 설정
  useEffect(() => {
    if (labelRef.current) labelRef.current.textContent = block.label ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부 변경 시만 DOM 동기화
  useEffect(() => {
    if (labelRef.current && document.activeElement !== labelRef.current) {
      labelRef.current.textContent = block.label ?? ''
    }
  }, [block.label])

  useEffect(() => {
    if (selected && labelRef.current && document.activeElement !== labelRef.current) {
      labelRef.current.focus()
    }
  }, [selected])

  return (
    <div
      className="group py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 버튼 + 삭제 버튼 */}
      <div className="flex items-center gap-2">
        <div
          ref={labelRef}
          contentEditable
          suppressContentEditableWarning
          data-ph="버튼 텍스트"
          className="inline-block min-w-[80px] cursor-text rounded-md bg-popup-accent px-6 py-2.5 text-sm font-medium text-white outline-none"
          onInput={(e) => onUpdate(block.id, { label: (e.target as HTMLDivElement).textContent ?? '' })}
          onFocus={() => onSelect(block.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddBelow(block.id) }
          }}
        />
        <button
          onClick={() => onDelete(block.id)}
          aria-label="블록 삭제"
          className="flex h-5 w-5 items-center justify-center rounded text-popup-faint opacity-0 transition-opacity hover:bg-popup-surface hover:text-popup-muted group-hover:opacity-100"
        >
          ×
        </button>
      </div>

      {/* hover 시 URL 입력 — 항상 렌더링, 높이로 토글 */}
      <div
        className={`overflow-hidden transition-all duration-150 ${
          hovered ? 'mt-1.5 max-h-12 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <input
          type="url"
          placeholder="링크 URL (https://...)"
          value={block.href ?? ''}
          onChange={(e) => onUpdate(block.id, { href: e.target.value })}
          onMouseEnter={() => setHovered(true)}
          className="w-full max-w-sm rounded-md border border-popup-border bg-popup-white px-3 py-1.5 text-xs text-popup-text outline-none focus:border-popup-accent"
        />
      </div>
    </div>
  )
}
