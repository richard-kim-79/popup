'use client'

import { useRef, useState, useCallback } from 'react'
import type { ImageBlock as ImageBlockType, ImageWidth } from '@/types'
import SizeOverlay, { getWidthClass } from './SizeOverlay'

interface Props {
  block: ImageBlockType
  slug: string
  editToken: string
  onUpdate: (id: string, patch: Partial<ImageBlockType>) => void
  onDelete: (id: string) => void
}

/** URL에서 파일명 추출 — 한글/영문/특수문자 모두 처리 */
function getFilename(url: string, fallback?: string): string {
  if (fallback) return fallback
  try {
    return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '파일')
  } catch {
    return url.split('/').pop() ?? '파일'
  }
}

function isPDF(url: string) { return url.toLowerCase().endsWith('.pdf') }

export default function ImageBlock({ block, slug, editToken, onUpdate, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [pendingName, setPendingName] = useState('')
  const [showSize, setShowSize]       = useState(false)

  const handleSizeChange = useCallback((w: ImageWidth) => {
    onUpdate(block.id, { width: w })
    setShowSize(false)
  }, [block.id, onUpdate])

  const handleFile = async (file: File) => {
    setPendingName(file.name)
    setUploading(true)
    setProgress(0)

    try {
      // 1단계: 서버에서 Signed URL 발급 (editToken 검증 + MIME 확인)
      const tokenRes = await fetch(`/api/pages/${slug}/upload`, {
        method: 'POST',
        headers: {
          'x-edit-token': editToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size }),
      })
      const tokenData = await tokenRes.json() as { signedUrl?: string; publicUrl?: string; filename?: string; error?: string }
      if (!tokenRes.ok || !tokenData.signedUrl) {
        alert(tokenData.error ?? '업로드 준비에 실패했습니다.')
        return
      }

      // 2단계: 클라이언트 → Supabase 직접 PUT (실제 진행률)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', tokenData.signedUrl!)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`업로드 실패 (${xhr.status})`))
        }
        xhr.onerror = () => reject(new Error('네트워크 오류'))
        xhr.send(file)
      })

      onUpdate(block.id, { url: tokenData.publicUrl!, filename: tokenData.filename ?? file.name, width: 'full' })
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      setPendingName('')
      setProgress(0)
    }
  }

  /* ── 업로드 완료 상태 ── */
  if (block.url) {
    const displayName = getFilename(block.url, block.filename)
    const widthClass  = getWidthClass(block.width)

    /* ── PDF ── */
    if (isPDF(block.url)) {
      return (
        <div
          className="group relative"
          onMouseEnter={() => setShowSize(true)}
          onMouseLeave={() => setShowSize(false)}
        >
          <div className={`${widthClass} relative transition-all duration-200`}>
            <a href={block.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-popup-border bg-popup-white p-4 transition-colors hover:border-popup-muted">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-popup-text" title={displayName}>{displayName}</p>
                <p className="mt-0.5 text-xs text-popup-faint">PDF · 클릭해서 열기</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {showSize && <SizeOverlay current={block.width} onChange={handleSizeChange} />}
          </div>
          <button onClick={() => onDelete(block.id)}
            className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            삭제
          </button>
        </div>
      )
    }

    /* ── 이미지 ── */
    return (
      <div
        className="group relative"
        onMouseEnter={() => setShowSize(true)}
        onMouseLeave={() => setShowSize(false)}
      >
        <div className={`${widthClass} relative transition-all duration-200`}>
          <img
            src={block.url}
            alt={displayName}
            className="w-full rounded-lg object-cover"
          />
          {showSize && <SizeOverlay current={block.width} onChange={handleSizeChange} />}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 15l5-5 4 4 3-2 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="max-w-[200px] truncate text-xs text-popup-faint" title={displayName}>{displayName}</span>
        </div>

        <button onClick={() => onDelete(block.id)}
          className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          삭제
        </button>
      </div>
    )
  }

  /* ── 업로드 전/중 상태 ── */
  return (
    <div
      className="group relative cursor-pointer rounded-lg border-2 border-dashed border-popup-border bg-popup-bg px-6 py-9 text-center transition-colors hover:border-popup-accent"
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && !uploading) handleFile(f) }}
    >
      <input ref={inputRef} type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {uploading ? (
        <>
          <p className="mb-3 max-w-full truncate text-xs font-medium text-popup-muted" title={pendingName}>
            {pendingName}
          </p>
          <div className="mx-auto mb-2 h-1.5 w-48 overflow-hidden rounded-full bg-popup-border">
            <div className="h-full rounded-full bg-popup-accent transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-popup-faint">업로드 중... {progress}%</p>
        </>
      ) : (
        <>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 opacity-30">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.75" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 16l4.5-4 3.5 3 3-2 7 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-popup-muted">이미지 / 문서 업로드</p>
          <p className="mt-1 text-xs text-popup-faint">클릭하거나 파일을 드래그하세요</p>
        </>
      )}

      <button onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
        className="absolute right-2 top-2 text-xs text-popup-muted opacity-0 transition-opacity group-hover:opacity-100">
        삭제
      </button>
    </div>
  )
}
