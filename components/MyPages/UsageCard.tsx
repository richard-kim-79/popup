'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface UsageData {
  tier: string
  tierName: string
  pageCount: number
  textBytes: number
  attachmentBytes: number
  usedBytes: number
  limitBytes: number
  usageRatio: number
  recommendUpgrade: boolean
  nextTier: string | null
  nextTierName: string | null
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

/**
 * 사용량 카드 + 상향 추천 — /my-pages 상단에 노출.
 *
 * - 80% 미만: 일반 톤 (popup-border)
 * - 80~99%: popup-warn 톤 + 다음 티어 추천 메시지 + CTA
 * - 100% 이상: popup-warn 강조 + "지금 업그레이드" CTA
 */
export default function UsageCard() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/subscriptions/usage')
      .then((r) => r.json())
      .then((d: UsageData | { error: string }) => {
        if ('error' in d) return
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data) return null

  const pct = Math.min(100, Math.round(data.usageRatio * 100))
  const over = data.usageRatio >= 1
  const recommendOrOver = data.recommendUpgrade || over

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 ${
        over
          ? 'border-popup-warn-border bg-popup-warn-bg'
          : data.recommendUpgrade
            ? 'border-popup-warn-border/60 bg-popup-warn-bg/50'
            : 'border-popup-border bg-popup-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-popup-muted">저장 용량</span>
            <span className={`text-xs font-semibold ${recommendOrOver ? 'text-popup-warn' : 'text-popup-text'}`}>
              {formatBytes(data.usedBytes)} / {formatBytes(data.limitBytes)}
            </span>
            <span className={`text-[10px] ${recommendOrOver ? 'text-popup-warn' : 'text-popup-muted'}`}>
              ({pct}%)
            </span>
            <span className="ml-1 text-[10px] text-popup-faint">· {data.pageCount}개 페이지 · {data.tierName}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-popup-faint">
            텍스트 {formatBytes(data.textBytes)} · 첨부 {formatBytes(data.attachmentBytes)}
          </p>

          {/* 진행률 바 */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-popup-surface">
            <div
              className={`h-full transition-all ${
                over
                  ? 'bg-popup-warn'
                  : data.recommendUpgrade
                    ? 'bg-popup-warn/70'
                    : 'bg-popup-accent'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {recommendOrOver && data.nextTier && (
            <p className="mt-2 text-[11px] text-popup-warn">
              {over
                ? `용량이 가득 찼어요. 더 만들려면 ${data.nextTierName}로 업그레이드해요.`
                : `용량의 ${pct}%를 사용 중이에요. ${data.nextTierName}로 올리면 여유 있게 쓸 수 있어요.`}
            </p>
          )}
        </div>

        {recommendOrOver && data.nextTier && (
          <Link
            href="/pricing"
            className="shrink-0 rounded-md bg-popup-accent px-3 py-1.5 text-xs font-medium text-popup-accent-fg hover:bg-popup-accent-hover whitespace-nowrap"
          >
            {data.nextTierName} 업그레이드
          </Link>
        )}
      </div>
    </div>
  )
}
