'use client'

import { useEffect, useState } from 'react'

interface Status {
  connected: boolean
  prefix: string | null
  createdAt: string | null
}

/**
 * Claude(MCP) 연결 — 개인 키가 담긴 전용 MCP URL을 발급/재발급/해제.
 * 이 URL을 Claude 커넥터에 추가하면, Claude에서 Popup 도구로 발행한 페이지가
 * 자동으로 이 계정(/my-pages)에 귀속된다.
 */
export default function McpConnect() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () =>
    fetch('/api/account/mcp-key')
      .then((r) => r.json())
      .then((d: Status) => setStatus(d))
      .catch(() => setStatus({ connected: false, prefix: null, createdAt: null }))

  useEffect(() => { void load() }, [])

  const issue = async () => {
    setBusy(true)
    setIssuedUrl(null)
    try {
      const r = await fetch('/api/account/mcp-key', { method: 'POST' })
      const d = await r.json() as { mcpUrl?: string; error?: string }
      if (!r.ok || !d.mcpUrl) { alert(d.error ?? '발급에 실패했습니다.'); return }
      setIssuedUrl(d.mcpUrl)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!confirm('연결을 해제하면 기존 MCP URL이 더 이상 동작하지 않아요. 계속할까요?')) return
    setBusy(true)
    try {
      await fetch('/api/account/mcp-key', { method: 'DELETE' })
      setIssuedUrl(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!issuedUrl) return
    try {
      await navigator.clipboard.writeText(issuedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* 무시 */ }
  }

  if (!status) return null

  return (
    <div className="mb-4 rounded-xl border border-popup-border bg-popup-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-popup-text">Claude(MCP) 연결</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-popup-faint">
            연결하면 Claude에서 Popup 도구로 만든 페이지가 자동으로 여기에 저장돼요.
          </p>
        </div>
        {status.connected ? (
          <span className="shrink-0 rounded-full bg-popup-accent-bg px-2 py-0.5 text-[10px] font-medium text-popup-accent">
            연결됨
          </span>
        ) : null}
      </div>

      {/* 갓 발급된 URL — 1회 표시 */}
      {issuedUrl && (
        <div className="mt-2.5 rounded-lg border border-popup-accent/40 bg-popup-accent-bg/50 p-2.5">
          <p className="mb-1 text-[10px] font-medium text-popup-accent">
            아래 URL을 Claude 설정 → 커넥터/통합에 추가하세요. (다시 표시되지 않아요)
          </p>
          <div className="flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-popup-white px-2 py-1 text-[11px] text-popup-text">
              {issuedUrl}
            </code>
            <button
              onClick={() => void copy()}
              className="shrink-0 rounded-md bg-popup-accent px-2.5 py-1 text-[11px] font-medium text-popup-accent-fg hover:bg-popup-accent-hover"
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-popup-warn">
            키가 포함된 주소예요. 비밀번호처럼 안전하게 보관하세요.
          </p>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {!status.connected ? (
          <button
            onClick={() => void issue()}
            disabled={busy}
            className="rounded-md bg-popup-accent px-3 py-1.5 text-xs font-medium text-popup-accent-fg hover:bg-popup-accent-hover disabled:opacity-50"
          >
            {busy ? '발급 중…' : 'Claude에 연결하기'}
          </button>
        ) : (
          <>
            <button
              onClick={() => void issue()}
              disabled={busy}
              className="rounded-md border border-popup-border bg-popup-white px-3 py-1.5 text-xs text-popup-text hover:border-popup-text disabled:opacity-50"
            >
              {busy ? '처리 중…' : 'URL 재발급'}
            </button>
            <button
              onClick={() => void disconnect()}
              disabled={busy}
              className="rounded-md px-3 py-1.5 text-xs text-popup-warn hover:bg-popup-warn-bg disabled:opacity-50"
            >
              연결 해제
            </button>
            {status.prefix && (
              <span className="ml-auto text-[10px] text-popup-faint">{status.prefix}…</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
