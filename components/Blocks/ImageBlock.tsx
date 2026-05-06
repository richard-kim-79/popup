'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { ImageBlock as ImageBlockType, ImageWidth, MediaType } from '@/types'
import SizeOverlay, { getWidthClass } from './SizeOverlay'

interface Props {
  block: ImageBlockType
  slug: string
  editToken: string
  onUpdate: (id: string, patch: Partial<ImageBlockType>) => void
  onDelete: (id: string) => void
  onAddFilesBelow?: (files: File[]) => void
  initialFile?: File
}

// Supabase 인증 헤더 — XHR 업로드에 필수
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** URL에서 파일명 추출 */
function getFilename(url: string, fallback?: string): string {
  if (fallback) return fallback
  try { return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '파일') }
  catch { return url.split('/').pop() ?? '파일' }
}

const PDF_EXT   = /\.pdf$/i
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i

const VIDEO_MIME = new Set([
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
])

function detectMediaType(url: string, mediaType?: MediaType): MediaType {
  if (mediaType) return mediaType
  if (PDF_EXT.test(url))   return 'pdf'
  if (VIDEO_EXT.test(url)) return 'video'
  return 'image'
}

function mimeToMediaType(mime: string): MediaType {
  if (mime === 'application/pdf') return 'pdf'
  if (VIDEO_MIME.has(mime))       return 'video'
  return 'image'
}

/**
 * XHR 업로드 — 실시간 진행률 (0-100%)
 *
 * Supabase 스토리지 signed URL 업로드는 Authorization + apikey 헤더가 필수.
 * supabase.storage.uploadToSignedUrl() 은 내부에서 this.headers 로 자동 추가하지만
 * 직접 XHR을 쓸 때는 명시적으로 넣어야 한다.
 */
function uploadViaXhr(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)

    // Content-Type — 비어있으면 octet-stream으로 fallback (일부 Android)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    // Supabase 스토리지 필수 헤더
    xhr.setRequestHeader('x-upsert', 'false')
    if (SUPABASE_ANON_KEY) {
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        // 실제 응답 본문을 에러에 포함해 원인 파악 용이하게
        let detail = ''
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string }
          detail = parsed.message ?? parsed.error ?? xhr.responseText.slice(0, 120)
        } catch {
          detail = xhr.responseText.slice(0, 120)
        }
        reject(new Error(`업로드 실패 (HTTP ${xhr.status})${detail ? ': ' + detail : ''}`))
      }
    }
    xhr.onerror = () => reject(new Error('네트워크 오류. 연결 상태를 확인하세요.'))
    xhr.onabort = () => reject(new Error('업로드가 취소됐습니다.'))
    xhr.send(file)
  })
}

export default function ImageBlock({
  block, slug, editToken, onUpdate, onDelete, onAddFilesBelow, initialFile,
}: Props) {
  const inputRef        = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [pendingName, setPendingName] = useState('')
  const [showSize, setShowSize]       = useState(false)
  const uploadingRef   = useRef(false)
  const handledFileRef = useRef<File | undefined>(undefined)

  const handleSizeChange = useCallback((w: ImageWidth) => {
    onUpdate(block.id, { width: w })
    setShowSize(false)
  }, [block.id, onUpdate])

  const uploadFile = useCallback(async (file: File) => {
    if (uploadingRef.current) return
    uploadingRef.current = true
    setPendingName(file.name)
    setUploading(true)
    setProgress(0)

    try {
      // ① Signed URL 발급 (Vercel 경유 — 파일 본문은 여기로 안 보냄)
      const tokenRes = await fetch(`/api/pages/${slug}/upload`, {
        method: 'POST',
        headers: { 'x-edit-token': editToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          // 일부 기기에서 file.type이 빈 문자열일 수 있으므로 확장자로 보완
          mimeType: file.type || guessMime(file.name),
          size: file.size,
        }),
      })
      const tokenData = await tokenRes.json() as {
        signedUrl?: string; token?: string; path?: string
        publicUrl?: string; filename?: string; isVideo?: boolean; error?: string
      }

      if (!tokenRes.ok || !tokenData.signedUrl || !tokenData.publicUrl) {
        alert(tokenData.error ?? '업로드 준비에 실패했습니다.')
        return
      }

      // ② 파일을 브라우저에서 Supabase로 직접 PUT (Vercel 미경유)
      await uploadViaXhr(tokenData.signedUrl, file, setProgress)

      // ③ 블록 업데이트
      onUpdate(block.id, {
        url: tokenData.publicUrl,
        filename: tokenData.filename ?? file.name,
        width: 'full',
        mediaType: mimeToMediaType(file.type || guessMime(file.name)),
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      setPendingName('')
      setProgress(0)
      uploadingRef.current = false
    }
  }, [block.id, slug, editToken, onUpdate])

  // initialFile 변경 시 자동 업로드
  useEffect(() => {
    if (
      initialFile &&
      !block.url &&
      !uploadingRef.current &&
      initialFile !== handledFileRef.current
    ) {
      handledFileRef.current = initialFile
      uploadFile(initialFile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    if (arr.length === 0) return
    const [first, ...rest] = arr
    uploadFile(first)
    if (rest.length > 0 && onAddFilesBelow) onAddFilesBelow(rest)
  }, [uploadFile, onAddFilesBelow])

  /* ── 업로드 완료 상태 ── */
  if (block.url) {
    const displayName = getFilename(block.url, block.filename)
    const widthClass  = getWidthClass(block.width)
    const kind        = detectMediaType(block.url, block.mediaType)

    /* ── PDF ── */
    if (kind === 'pdf') {
      const w = block.width ?? 'full'
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
              {w !== 'small' && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-popup-text" title={displayName}>{displayName}</p>
                  {w === 'full' && <p className="mt-0.5 text-xs text-popup-faint">PDF · 클릭해서 열기</p>}
                </div>
              )}
              {w !== 'small' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </a>
            {showSize && <SizeOverlay current={block.width} onChange={handleSizeChange} />}
          </div>
          <button onClick={() => onDelete(block.id)}
            className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            삭제
          </button>
        </div>
      )
    }

    /* ── 영상 ── */
    if (kind === 'video') {
      return (
        <div
          className="group relative"
          onMouseEnter={() => setShowSize(true)}
          onMouseLeave={() => setShowSize(false)}
        >
          <div className={`${widthClass} relative transition-all duration-200`}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={block.url}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '80vh' }}
            />
            {showSize && <SizeOverlay current={block.width} onChange={handleSizeChange} />}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0 text-popup-faint">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
            </svg>
            <span className="max-w-[200px] truncate text-xs text-popup-faint" title={displayName}>{displayName}</span>
          </div>
          <button onClick={() => onDelete(block.id)}
            className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
          <img src={block.url} alt={displayName} className="w-full rounded-lg object-cover" />
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
          className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
      onDrop={(e) => { e.preventDefault(); if (!uploading) handleFiles(e.dataTransfer.files) }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm,video/x-m4v,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files) }}
      />

      {uploading ? (
        <>
          <p className="mb-3 max-w-full truncate text-xs font-medium text-popup-muted" title={pendingName}>
            {pendingName}
          </p>
          <div className="mx-auto mb-2 h-1.5 w-48 overflow-hidden rounded-full bg-popup-border">
            <div
              className="h-full rounded-full bg-popup-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-popup-faint">{progress}%</p>
        </>
      ) : (
        <>
          <div className="mx-auto mb-3 flex items-center justify-center gap-2 opacity-30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.75" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 16l4.5-4 3.5 3 3-2 7 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
            </svg>
          </div>
          <p className="text-sm text-popup-muted">이미지 · 영상 · 문서 업로드</p>
          <p className="mt-1 text-xs text-popup-faint">
            이미지/PDF 50MB · 영상 최대 1GB · 클릭하거나 드래그
          </p>
        </>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
        className="absolute right-2 top-2 rounded bg-black/30 px-2 py-0.5 text-xs text-white transition-opacity sm:bg-transparent sm:text-popup-muted sm:opacity-0 sm:group-hover:opacity-100"
      >
        삭제
      </button>
    </div>
  )
}

/** 파일명 확장자로 MIME 추측 — file.type이 비어있을 때 사용 */
function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif',  webp: 'image/webp', pdf: 'application/pdf',
    mp4: 'video/mp4',  mov: 'video/quicktime',
    webm: 'video/webm', m4v: 'video/x-m4v',
  }
  return map[ext] ?? 'application/octet-stream'
}
