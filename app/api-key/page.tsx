'use client'

import { useState } from 'react'
import Link from 'next/link'

type Step = 'form' | 'done' | 'error'

export default function ApiKeyPage() {
  const [email, setEmail]   = useState('')
  const [step, setStep]     = useState<Step>('form')
  const [apiKey, setApiKey] = useState('')
  const [prefix, setPrefix] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrMsg('')
    try {
      const res  = await fetch('/api-key/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json() as { key?: string; prefix?: string; error?: string }
      if (!res.ok) {
        setErrMsg(data.error ?? '오류가 발생했습니다.')
        setStep('error')
      } else {
        setApiKey(data.key ?? '')
        setPrefix(data.prefix ?? '')
        setStep('done')
      }
    } catch {
      setErrMsg('네트워크 오류가 발생했습니다.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const CONFIG_JSON = `{
  "mcpServers": {
    "popup": {
      "command": "npx",
      "args": ["-y", "@blueslap/popup-mcp"],
      "env": {
        "MCP_API_KEY": "${apiKey}"
      }
    }
  }
}`

  return (
    <div className="min-h-screen bg-popup-bg">
      {/* Nav */}
      <nav className="flex h-11 items-center border-b border-popup-border px-6">
        <Link href="/" className="text-sm font-semibold text-popup-text opacity-70 hover:opacity-100">
          Popup
        </Link>
      </nav>

      <div className="mx-auto max-w-[520px] px-6 py-16">

        {/* 헤더 */}
        <h1 className="mb-2 text-2xl font-bold text-popup-text">API 키 발급</h1>
        <p className="mb-10 text-sm text-popup-muted">
          Claude Desktop에서 Popup MCP 도구를 사용하기 위한 API 키를 발급받으세요.
        </p>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-popup-text">
                이메일 주소
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-popup-border bg-popup-white px-3.5 py-2.5 text-sm text-popup-text outline-none transition-colors focus:border-popup-accent"
              />
              <p className="mt-1.5 text-xs text-popup-faint">
                이메일 1개당 API 키 1개가 발급됩니다.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-lg bg-popup-accent py-2.5 text-sm font-medium text-popup-accent-fg transition-colors hover:bg-popup-accent-hover disabled:opacity-40"
            >
              {loading ? '생성 중...' : 'API 키 발급받기'}
            </button>
          </form>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-popup-warn-border bg-popup-warn-bg px-4 py-3.5 text-sm text-popup-warn">
              {errMsg}
            </div>
            <button
              onClick={() => setStep('form')}
              className="text-sm text-popup-muted hover:text-popup-text"
            >
              ← 다시 시도
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-6">
            {/* 경고 */}
            <div className="rounded-xl border border-popup-warn-border bg-popup-warn-bg px-4 py-3 text-sm text-popup-warn">
              ⚠️ 이 키는 지금만 표시됩니다. 반드시 복사해 안전한 곳에 보관하세요.
            </div>

            {/* 키 표시 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-popup-text">발급된 API 키</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg border border-popup-border bg-popup-white px-3.5 py-2.5 text-xs text-popup-text">
                  {apiKey}
                </code>
                <button
                  onClick={copy}
                  className="shrink-0 rounded-lg border border-popup-border bg-popup-white px-3 py-2.5 text-xs font-medium text-popup-muted hover:border-popup-accent hover:text-popup-text"
                >
                  {copied ? '✓ 복사됨' : '복사'}
                </button>
              </div>
            </div>

            {/* Claude Desktop 설정 안내 */}
            <div>
              <p className="mb-2 text-sm font-medium text-popup-text">Claude Desktop 설정 방법</p>
              <p className="mb-2 text-xs text-popup-muted">
                <code className="rounded bg-popup-surface px-1 py-0.5">claude_desktop_config.json</code>에 아래 내용을 추가하세요.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-popup-border bg-popup-white p-4 text-[11px] leading-relaxed text-popup-text">
                {CONFIG_JSON}
              </pre>
              <p className="mt-2 text-xs text-popup-faint">
                파일 위치: macOS → <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
              </p>
            </div>

            <div className="border-t border-popup-border pt-4 text-xs text-popup-faint space-y-1">
              <p>• 키 이름: <strong className="text-popup-muted">{email}</strong></p>
              <p>• 분당 최대 60회 호출 가능</p>
              <p>• 문의: <a href="mailto:blueslap@naver.com" className="underline hover:text-popup-muted">blueslap@naver.com</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
