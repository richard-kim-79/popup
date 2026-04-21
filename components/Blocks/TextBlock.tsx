'use client'

import { useRef, useEffect, useCallback } from 'react'
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

// h1 자동 폰트 크기 조정: 텍스트가 한 줄을 넘지 않도록 shrink
const H1_MAX_PX = 36  // text-4xl
const H1_MIN_PX = 14

export default function TextBlock({ block, selected, onUpdate, onDelete, onAddBelow, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const style = STYLES[block.type]
  const isText = block.type === 'text'
  const isH1   = block.type === 'h1'

  // h1 전용: 텍스트가 컨테이너 너비를 초과하면 폰트 크기 줄이기
  const adjustH1FontSize = useCallback(() => {
    if (!isH1 || !ref.current) return
    const el = ref.current
    // 최대 크기에서 시작해 scrollWidth > offsetWidth이면 1px씩 줄임
    el.style.fontSize = `${H1_MAX_PX}px`
    let size = H1_MAX_PX
    while (el.scrollWidth > el.offsetWidth + 1 && size > H1_MIN_PX) {
      size--
      el.style.fontSize = `${size}px`
    }
  }, [isH1])

  // 초기 마운트 시 content 설정 + h1 크기 조정
  useEffect(() => {
    if (ref.current) ref.current.innerText = block.content ?? ''
    adjustH1FontSize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부(로드/복원)에서 content가 바뀔 때 DOM 동기화 + h1 크기 재조정
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.innerText = block.content ?? ''
      adjustH1FontSize()
    }
  }, [block.content, adjustH1FontSize])

  // 컨테이너 크기 변경(모바일 회전 등)에도 재조정
  useEffect(() => {
    if (!isH1 || !ref.current) return
    const ro = new ResizeObserver(() => adjustH1FontSize())
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [isH1, adjustH1FontSize])

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
        className={[
          'min-h-[1.2em] flex-1 py-0.5 text-popup-text',
          style.fontSize, style.fontWeight, style.lineHeight,
          isText ? 'whitespace-pre-wrap' : '',
          // h1: nowrap + overflow-hidden → scrollWidth로 overflow 측정 가능
          isH1 ? 'overflow-hidden whitespace-nowrap' : '',
        ].join(' ')}
        onInput={(e) => {
          const el = e.target as HTMLDivElement
          const raw = el.innerText
          const hasText = raw.replace(/\n/g, '').trim().length > 0
          const text = hasText && raw.endsWith('\n') && !raw.endsWith('\n\n')
            ? raw.slice(0, -1)
            : raw
          onUpdate(block.id, text)
          // 입력할 때마다 폰트 크기 재조정
          adjustH1FontSize()
        }}
        onFocus={() => onSelect(block.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (isText) {
              // text 블록: Enter → 줄바꿈
            } else {
              // h1/h2: Enter → 새 블록 추가
              e.preventDefault()
              if (!e.shiftKey) onAddBelow(block.id)
            }
          }
          if (e.key === 'Backspace' && !(ref.current?.innerText ?? '').trim()) {
            e.preventDefault()
            onDelete(block.id)
          }
        }}
      />
      <button
        onClick={() => onDelete(block.id)}
        aria-label="블록 삭제"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-popup-faint transition-opacity hover:bg-popup-surface hover:text-popup-muted sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}
