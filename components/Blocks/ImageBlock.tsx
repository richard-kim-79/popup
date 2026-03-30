'use client'

import { useRef, useState } from 'react'
import type { ImageBlock as ImageBlockType } from '@/types'

interface Props {
  block: ImageBlockType
  slug: string
  editToken: string
  onUpdate: (id: string, url: string) => void
  onDelete: (id: string) => void
}

export default function ImageBlock({ block, slug, editToken, onUpdate, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    setUploading(true)
    setProgress(10)

    const form = new FormData()
    form.append('file', file)

    const res = await fetch(`/api/pages/${slug}/upload`, {
      method: 'POST',
      headers: { 'x-edit-token': editToken },
      body: form,
    })
    setProgress(90)
    const data = await res.json()
    setProgress(100)
    setUploading(false)

    if (res.ok) {
      onUpdate(block.id, data.url)
    } else {
      alert(data.error ?? '업로드에 실패했습니다.')
    }
  }

  if (block.url) {
    return (
      <div className="group relative">
        {block.url.match(/\.(mp4|mov)$/i) ? (
          <video src={block.url} controls className="w-full rounded-lg" />
        ) : block.url.endsWith('.pdf') ? (
          <a href={block.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-popup-border p-4 text-sm text-popup-accent">
            📄 PDF 파일 열기
          </a>
        ) : (
          <img src={block.url} alt="" className="w-full rounded-lg object-cover" />
        )}
        <button
          onClick={() => onDelete(block.id)}
          className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          삭제
        </button>
      </div>
    )
  }

  return (
    <div
      className="group relative cursor-pointer rounded-lg border-2 border-dashed border-popup-border bg-popup-bg px-6 py-9 text-center transition-colors hover:border-popup-accent"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {uploading ? (
        <div>
          <div className="mx-auto mb-3 h-1.5 w-48 overflow-hidden rounded-full bg-popup-border">
            <div className="h-full rounded-full bg-popup-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-popup-muted">업로드 중...</p>
        </div>
      ) : (
        <>
          <div className="mb-2 text-2xl opacity-40">⬛</div>
          <p className="text-sm text-popup-muted">이미지 / 동영상 / 문서 업로드</p>
          <p className="mt-1 text-xs text-popup-faint">클릭하거나 파일을 드래그하세요</p>
        </>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
        className="absolute right-2 top-2 text-xs text-popup-muted opacity-0 transition-opacity group-hover:opacity-100"
      >
        삭제
      </button>
    </div>
  )
}
