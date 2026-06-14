'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/UI/Modal'

export default function LandingClient() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [htmlUploading, setHtmlUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showHtmlModal, setShowHtmlModal] = useState(false)
  const [modalDragOver, setModalDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 전체 페이지 드래그 감지
  useEffect(() => {
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true) }
    const onDragLeave = (e: DragEvent) => { if (!e.relatedTarget) setDragOver(false) }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) void handleHtmlFile(file)
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (file) {
      setShowHtmlModal(false)
      void handleHtmlFile(file)
    }
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
      {/* ── 전체 페이지 드롭존 오버레이 ──────────────────────── */}
      {dragOver && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-popup-accent/10 backdrop-blur-[2px] pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-popup-accent bg-popup-white/90 px-12 py-8 text-center shadow-xl">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-base font-semibold text-popup-accent">HTML 파일을 놓으세요</p>
            <p className="mt-1 text-xs text-popup-muted">.html · 최대 500KB</p>
          </div>
        </div>
      )}

      {/* ── 메인 버튼 ─────────────────────────────────────────── */}
      <button
        onClick={handleCreate}
        disabled={isLoading}
        className="rounded-xl bg-popup-accent px-10 py-3.5 text-[15px] font-medium text-popup-accent-fg hover:bg-popup-accent-hover active:scale-[.98] disabled:opacity-60"
      >
        {creating ? '만드는 중…' : '새 팝업 페이지 만들기'}
      </button>

      {/* ── HTML 업로드 진입 (텍스트 링크 → 모달) ─────────────── */}
      <button
        onClick={() => !isLoading && setShowHtmlModal(true)}
        disabled={isLoading}
        className="mt-3 max-w-xs text-center text-sm text-popup-muted underline-offset-2 hover:text-popup-accent hover:underline transition-colors disabled:opacity-50"
      >
        {htmlUploading ? 'HTML 업로드 중…' : '인공지능으로 만든 웹페이지 쉽게 공유해보세요'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* ── HTML 파일 업로드 모달 ────────────────────────────── */}
      {showHtmlModal && (
        <Modal onClose={() => !htmlUploading && setShowHtmlModal(false)} maxWidth={420}>
          <div className="text-center">
            <p className="mb-3 text-3xl">📄</p>
            <p className="mb-1 text-base font-semibold text-popup-text">HTML 파일 업로드</p>
            <p className="mb-5 text-xs text-popup-muted">
              AI가 만든 HTML을 변형 없이 그대로 공유 링크로
            </p>

            {/* 드롭존 */}
            <div
              onDragOver={(e) => { e.preventDefault(); setModalDragOver(true) }}
              onDragLeave={() => setModalDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setModalDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  setShowHtmlModal(false)
                  void handleHtmlFile(file)
                }
              }}
              onClick={() => !htmlUploading && fileInputRef.current?.click()}
              className={`mb-3 cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                modalDragOver
                  ? 'border-popup-accent bg-popup-accent-bg'
                  : 'border-popup-border bg-popup-surface/40 hover:border-popup-accent hover:bg-popup-accent-bg'
              } ${htmlUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <p className="mb-1 text-sm font-medium text-popup-text">
                파일을 여기에 놓거나 클릭해서 선택
              </p>
              <p className="text-xs text-popup-muted">.html · 최대 500KB</p>
            </div>

            <p className="text-[11px] text-popup-faint">
              파일 업로드 후 자동으로 공유 링크가 만들어져요
            </p>
          </div>
        </Modal>
      )}

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
