'use client'

import { useState, useRef, useEffect } from 'react'
import type { BlockType } from '@/types'

const ITEMS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'text', label: '글',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16M4 12h10M4 17h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'h1', label: '제목',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <text x="4" y="17" fontSize="14" fontWeight="bold" fill="currentColor" fontFamily="system-ui">H1</text>
      </svg>
    ),
  },
  {
    type: 'image', label: '업로드',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8.5" cy="9.5" r="1.75" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 16l4.5-4 3.5 3 3-2 7 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'youtube', label: '유튜브',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 8.5v7l5.5-3.5L10 8.5z" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'link', label: '링크',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'button', label: '버튼',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="10" rx="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'divider', label: '구분선',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="1" fill="currentColor" opacity="0.4" />
        <circle cx="12" cy="12" r="1" fill="currentColor" opacity="0.4" />
        <circle cx="16" cy="12" r="1" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
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
    <div ref={ref} className="mt-5">
      {/* + trigger row */}
      <div className="flex items-center gap-3">
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

        {!open && <div className="h-px flex-1 bg-popup-border opacity-60" />}
      </div>

      {/* Grid panel */}
      {open && (
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-popup-border bg-popup-white p-3 shadow-sm sm:grid-cols-7">
          {ITEMS.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => handleAdd(type)}
              className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-popup-muted transition-colors hover:bg-popup-accent-bg hover:text-popup-accent"
            >
              <span className="opacity-60">{icon}</span>
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
