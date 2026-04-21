'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { ButtonBlock as ButtonBlockType } from '@/types'
import { PALETTE_GROUPS, applyAccentColor, getFgColor } from '@/lib/palette'

const DEFAULT_HEX = '#2E6B52'

interface Props {
  block: ButtonBlockType
  selected: boolean
  onUpdate: (id: string, patch: Partial<ButtonBlockType>) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onSelect: (id: string) => void
}

export default function ButtonBlock({ block, selected, onUpdate, onDelete, onAddBelow, onSelect }: Props) {
  const labelRef  = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const bgColor  = block.color ?? DEFAULT_HEX
  const textColor = getFgColor(bgColor)

  useEffect(() => {
    if (labelRef.current) labelRef.current.textContent = block.label ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleColorSelect = useCallback((hex: string) => {
    onUpdate(block.id, { color: hex })
    applyAccentColor(hex)   // UI 기능 버튼들도 실시간 동기화
  }, [block.id, onUpdate])

  return (
    <div
      className="group py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 버튼 + 삭제 */}
      <div className="flex items-center gap-2">
        <div
          ref={labelRef}
          contentEditable
          suppressContentEditableWarning
          data-ph="버튼 텍스트"
          style={{ backgroundColor: bgColor, color: textColor }}
          className="inline-block min-w-[80px] cursor-text rounded-md px-6 py-2.5 text-sm font-medium outline-none"
          onInput={(e) => onUpdate(block.id, { label: (e.target as HTMLDivElement).textContent ?? '' })}
          onFocus={() => onSelect(block.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddBelow(block.id) }
          }}
        />
        <button
          onClick={() => onDelete(block.id)}
          aria-label="블록 삭제"
          className="flex h-7 w-7 items-center justify-center rounded text-popup-faint transition-opacity hover:bg-popup-surface hover:text-popup-muted sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover:opacity-100"
        >
          ×
        </button>
      </div>

      {/* hover 시 URL + 색상 팔레트 */}
      <div
        className={`overflow-hidden transition-all duration-150 ${
          hovered ? 'mt-1.5 max-h-[260px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        onMouseEnter={() => setHovered(true)}
      >
        {/* URL 입력 */}
        <input
          type="url"
          placeholder="링크 URL (https://...)"
          value={block.href ?? ''}
          onChange={(e) => onUpdate(block.id, { href: e.target.value })}
          className="w-full max-w-sm rounded-md border border-popup-border bg-popup-white px-3 py-1.5 text-xs text-popup-text outline-none focus:border-popup-accent"
        />

        {/* 색상 팔레트 — 그룹별 스크롤 */}
        <div className="mt-2 max-h-[200px] overflow-y-auto rounded-md border border-popup-border bg-popup-white p-2 shadow-sm">
          {PALETTE_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-popup-faint">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.colors.map((c) => (
                  <button
                    key={c.hex}
                    title={c.label}
                    onClick={() => handleColorSelect(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                      bgColor === c.hex
                        ? 'scale-110 border-popup-text ring-1 ring-popup-text ring-offset-1'
                        : 'border-popup-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
