'use client'

import { useState } from 'react'
import Modal from '@/components/UI/Modal'
import QRCode from 'react-qr-code'

interface Props {
  slug: string
  onClose: () => void
}

export default function ShareModal({ slug, onClose }: Props) {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim()
  const url = `${baseUrl}/${slug}`
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal onClose={onClose} maxWidth={360}>
      <p className="mb-3 text-sm text-popup-muted">링크를 공유하세요</p>

      {/* URL + copy */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-popup-border bg-popup-surface px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-xs text-popup-text">{url}</span>
        <button
          onClick={handleCopy}
          className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-all ${
            copied
              ? 'text-popup-accent'
              : 'bg-popup-accent text-popup-accent-fg hover:bg-popup-accent-hover'
          }`}
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowQr((v) => !v)}
          className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
            showQr
              ? 'border-popup-accent text-popup-accent'
              : 'border-popup-border text-popup-muted hover:border-popup-text hover:text-popup-text'
          }`}
        >
          QR코드
        </button>
      </div>

      {showQr && (
        <div className="mt-3 flex justify-center rounded-lg bg-popup-surface p-4">
          <QRCode value={url} size={140} bgColor="transparent" />
        </div>
      )}
    </Modal>
  )
}
