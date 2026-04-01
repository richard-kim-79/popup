'use client'

import { useRef, useEffect } from 'react'
import type { TextBlock as TextBlockType } from '@/types'

interface Props {
  block: TextBlockType
  selected: boolean
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onSelect: (id: string) => void
}

const STYLES: Record<string, { fontSize: string; fontWeight: string; lineHeight: string; placeholder: string }> = {
  h1:   { fontSize: 'text-4xl', fontWeight: 'font-extrabold', lineHeight: 'leading-snug',    placeholder: '제목' },
  h2:   { fontSize: 'text-2xl', fontWeight: 'font-bold',      lineHeight: 'leading-snug',    placeholder: '소제목' },
  text: { fontSize: 'text-base', fontWeight: 'font-normal',   lineHeight: 'leading-relaxed', placeholder: '내용을 입력하세요...' },
}

export default function TextBlock({ block, selected, onUpdate, onDelete, onAddBelow, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const style = STYLES[block.type]
  const isText = block.type === 'text'

  // 초기 마운트 시 한 번만 content 설정
  useEffect(() => {
    if (ref.current) ref.current.innerText = block.content ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부(로드/복원)에서 content가 바뀔 때만 DOM 동기화
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.innerText = block.content ?? ''
    }
  }, [block.content])

  useEffect(() => {
    if (selected && ref.current && document.activeElement !== ref.current) {
      ref.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [selected])

  return (
    <div className="group flex items-start gap-2">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-ph={style.placeholder}
        className={`min-h-[1.2em] flex-1 py-0.5 text-popup-text ${style.fontSize} ${style.fontWeight} ${style.lineHeight}${isText ? ' whitespace-pre-wrap' : ''}`}
        onInput={(e) => {
          const el = e.target as HTMLDivElement
          // innerText preserves \n from <br> and <div> elements
          const text = el.innerText.replace(/\n$/, '')
          onUpdate(block.id, text)
        }}
        onFocus={() => onSelect(block.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (isText) {
              // text 블록: Enter → 줄바꿈 (브라우저 기본 동작 허용)
              // Shift+Enter도 동일하게 허용
            } else {
              // h1/h2: Enter → 새 블록 추가
              e.preventDefault()
              if (!e.shiftKey) onAddBelow(block.id)
            }
          }
          if (e.key === 'Backspace' && !ref.current?.textContent?.trim()) {
            e.preventDefault()
            onDelete(block.id)
          }
        }}
      />
      <button
        onClick={() => onDelete(block.id)}
        aria-label="블록 삭제"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-popup-faint opacity-0 transition-opacity hover:bg-popup-surface hover:text-popup-muted group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}
