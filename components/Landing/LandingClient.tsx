'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'

const REF_KEY = 'popup_ref'

export default function LandingClient() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [htmlUploading, setHtmlUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 유입 출처(ref) 보존 + 유입 이벤트 비콘 — 채널별 전환 측정 ──
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref) {
        sessionStorage.setItem(REF_KEY, ref)
        // arrival 이벤트 기록 (fire-and-forget)
        void fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'arrival', source: ref }),
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      // 무시
    }
  }, [])

  /** 저장된 ref(생성 출처) 반환 — 없으면 undefined */
  const getSource = (): string | undefined => {
    try {
      return sessionStorage.getItem(REF_KEY) ?? undefined
    } catch {
      return undefined
    }
  }

  // 전체 페이지 드래그 감지
  useEffect(() => {
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true) }
    const onDragLeave = (e: DragEvent) => { if (!e.relatedTarget) setDragOver(false) }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) void handleFile(file)
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
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: [], source: getSource() }),
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
    if (file.size > 5_000_000) {
      alert('HTML 파일은 5MB 이하여야 합니다.')
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
    const res = await fetch('/api/pages/html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, source: getSource() }),
    })

    const data = await res.json() as { slug?: string; editToken?: string; error?: string }
    if (!res.ok || !data.slug) {
      alert(data.error ?? '페이지 생성에 실패했습니다.')
      setHtmlUploading(false)
      return
    }

    localStorage.setItem(`popup_token_${data.slug}`, data.editToken ?? '')
    router.push(`/${data.slug}/edit`)
  }

  // ── PDF 파일 처리 — Storage 업로드 후 풀스크린 PDF 페이지로 ──────
  const handlePdfFile = async (file: File) => {
    if (file.size > 50_000_000) {
      alert('PDF 파일은 50MB 이하여야 합니다.')
      return
    }
    setHtmlUploading(true)
    const res = await fetch('/api/pages/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        size: file.size,
        source: getSource(),
      }),
    })
    const data = await res.json() as {
      slug?: string; editToken?: string; token?: string; path?: string; error?: string
    }
    if (!res.ok || !data.slug || !data.token || !data.path) {
      alert(data.error ?? 'PDF 페이지 생성에 실패했습니다.')
      setHtmlUploading(false)
      return
    }
    // 서명 URL에 PDF 바이트 업로드 (헤더는 supabase-js가 처리)
    const supabase = getSupabaseBrowser()
    const { error: upErr } = await supabase.storage.from('media').uploadToSignedUrl(data.path, data.token, file, {
      contentType: 'application/pdf',
    })
    if (upErr) {
      alert(`PDF 업로드 실패: ${upErr.message}`)
      setHtmlUploading(false)
      return
    }
    localStorage.setItem(`popup_token_${data.slug}`, data.editToken ?? '')
    router.push(`/${data.slug}`)
  }

  // 확장자로 HTML / PDF 분기
  const handleFile = (file: File) => {
    if (/\.pdf$/i.test(file.name)) return handlePdfFile(file)
    if (/\.html?$/i.test(file.name)) return handleHtmlFile(file)
    alert('.html · .pdf 파일만 올릴 수 있어요.')
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  const isLoading = creating || htmlUploading

  return (
    <>
      {/* ── 전체 페이지 드롭존 오버레이 ──────────────────────── */}
      {dragOver && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-popup-accent/10 backdrop-blur-[2px] pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-popup-accent bg-popup-white/90 px-12 py-8 text-center shadow-xl">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-base font-semibold text-popup-accent">HTML · PDF 파일을 놓으세요</p>
            <p className="mt-1 text-xs text-popup-muted">.html · .pdf</p>
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

      {/* ── HTML 업로드 진입 (점선 드롭존 — 클릭/드래그) ──────── */}
      <button
        onClick={() => !isLoading && fileInputRef.current?.click()}
        disabled={isLoading}
        className="group mt-5 w-full max-w-xs rounded-xl border-2 border-dashed border-popup-border bg-popup-surface/40 px-5 py-4 text-center transition-colors hover:border-popup-accent hover:bg-popup-accent-bg disabled:opacity-50"
      >
        <span className="block text-sm font-medium text-popup-text">
          📄 HTML · PDF 올려서 바로 공유
        </span>
        <span className="mt-0.5 block text-xs text-popup-muted">
          {htmlUploading
            ? '업로드 중…'
            : '끌어다 놓거나 클릭'}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.pdf"
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
