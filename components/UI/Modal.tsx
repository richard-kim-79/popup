'use client'

import { useEffect } from 'react'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
}

export default function Modal({ onClose, children, maxWidth = 440 }: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-2xl bg-popup-white p-7"
        style={{ maxWidth, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded text-popup-muted hover:text-popup-text transition-colors"
          aria-label="닫기"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
