// ============================================================
// 검색 갤러리 노출용 제목·설명 추출
// 블록 페이지: h1→h2→text 우선순위 / HTML 페이지: <title>·og:title·meta
// ============================================================

import { extractHtmlMeta } from '@/lib/html-meta'

interface MiniBlock {
  type?: string
  content?: string
}

/**
 * 갤러리 표시용 title/description 도출.
 * 블록에서 먼저 시도하고, 비어 있고 html이 있으면 HTML 메타에서 도출.
 * title 없으면 null(=노출 부적합).
 */
export function deriveListing(blocks: unknown, html?: string | null): {
  title: string | null
  description: string | null
} {
  const arr: MiniBlock[] = Array.isArray(blocks) ? (blocks as MiniBlock[]) : []

  let title: string | null = null
  for (const t of ['h1', 'h2', 'text'] as const) {
    const b = arr.find(
      (x) => x?.type === t && typeof x.content === 'string' && x.content.trim(),
    )
    if (b?.content) {
      title = b.content.trim().slice(0, 80)
      break
    }
  }

  let description: string | null = null
  const textB = arr.find(
    (x) =>
      x?.type === 'text' &&
      typeof x.content === 'string' &&
      x.content.trim() &&
      x.content.trim().slice(0, 80) !== title,
  )
  if (textB?.content) description = textB.content.trim().slice(0, 200)

  // 블록에서 못 뽑았고 HTML이 있으면 HTML 메타에서 도출
  if (!title && html) {
    const meta = extractHtmlMeta(html)
    if (meta.title?.trim()) title = meta.title.trim().slice(0, 80)
    if (!description && meta.description?.trim()) description = meta.description.trim().slice(0, 200)
  }

  return { title, description }
}
