'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingClient() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [htmlUploading, setHtmlUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 블록 페이지 생성 ───────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true)
    const tempPin = Math.floor(100000 + Math.random() * 900000).toString()
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: tempPin, blocks: [] }),
    })
    const data = await res.json() as { slug?: string; editToken?: string; error?: string }
    if (!res.ok || !data.slug) {
      alert(data.error ?? '페이지 생성에 실패했습니다.')
      setCreating(false)
      return
    }
    localStorage.setItem(`popup_token_${data.slug}`, data.editToken ?? '')
    router.push(`/${data.slug}/edit`)
  }

  // ── HTML 파일 처리 ────────────────────────────────────────────
  const handleHtmlFile = async (file: File) => {
    if (!file.name.match(/\.html?$/i)) {
      alert('.html 또는 .htm 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 500_000) {
      alert('HTML 파일은 500KB 이하여야 합니다.')
      return
    }

    setHtmlUploading(true)

    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file, 'utf-8')
    })

    // 임시 PIN — 공유 버튼 클릭 시 진짜 PIN으로 교체
    const tempPin = Math.floor(100000 + Math.random() * 900000).toString()
    const res = await fetch('/api/pages/html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: tempPin, html }),
    })

    const data = await res.json() as { slug?: string; editToken?: string; error?: string }
    if (!res.ok || !data.slug) {
      alert(data.error ?? '페이지 생성에 실패했습니다.')
      setHtmlUploading(false)
      return
    }

    localStorage.setItem(`popup_token_${data.slug}`, data.editToken ?? '')
    // popup_pin_set_${slug} 미설정 → ShareModal에서 PIN 설정 유도
    router.push(`/${data.slug}/edit`)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleHtmlFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleHtmlFile(file)
  }

  const isLoading = creating || htmlUploading

  return (
    <>
      {/* ── 메인 버튼 ─────────────────────────────────────────── */}
      <button
        onClick={handleCreate}
        disabled={isLoading}
        className="rounded-xl bg-popup-accent px-10 py-3.5 text-[15px] font-medium text-popup-accent-fg hover:bg-popup-accent-hover active:scale-[.98] disabled:opacity-60"
      >
        {creating ? '만드는 중…' : '새 팝업 페이지 만들기'}
      </button>

      {/* ── HTML 파일 업로드 ──────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-3 text-sm transition-colors ${
          dragOver
            ? 'border-popup-accent bg-popup-accentBg text-popup-accent'
            : 'border-popup-faint text-popup-muted hover:border-popup-accent hover:text-popup-accent'
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <span className="text-base">📄</span>
        <span>{htmlUploading ? 'HTML 업로드 중…' : 'HTML 파일로 시작 (.html · 최대 500KB)'}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* ── 로딩 오버레이 ─────────────────────────────────────── */}
      {isLoading && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-popup-white px-7 py-5 text-sm text-popup-muted shadow-lg">
            {htmlUploading ? 'HTML 페이지 만드는 중…' : '만드는 중…'}
          </div>
        </div>
      )}
    </>
  )
}
