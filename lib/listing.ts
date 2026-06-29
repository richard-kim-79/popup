// ============================================================
// 검색 갤러리 노출용 제목·설명 추출
// 블록 페이지: h1→h2→text 우선순위 / HTML 페이지: <title>·og:title·meta
// ============================================================

import { extractHtmlMeta } from '@/lib/html-meta'

interface MiniBlock {
  type?: string
  content?: string
  url?: string
}

const IMG_URL_RE = /^https?:\/\//i
const PDF_RE = /\.pdf(\?|$)/i

/**
 * 갤러리 표시용 title/description/image 도출.
 * 블록에서 먼저 시도하고, 비어 있고 html이 있으면 HTML 메타에서 도출.
 * title 없으면 null(=노출 부적합). image는 썸네일(없으면 null).
 */
export function deriveListing(blocks: unknown, html?: string | null): {
  title: string | null
  description: string | null
  image: string | null
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

  // 썸네일: 첫 이미지 블록(http url, PDF 제외)
  let image: string | null = null
  const imgB = arr.find(
    (x) => x?.type === 'image' && typeof x.url === 'string' && IMG_URL_RE.test(x.url) && !PDF_RE.test(x.url),
  )
  if (imgB?.url) image = imgB.url

  // 블록에서 못 뽑았고 HTML이 있으면 HTML 메타에서 도출
  if (html) {
    const meta = extractHtmlMeta(html)
    if (!title && meta.title?.trim()) title = meta.title.trim().slice(0, 80)
    if (!description && meta.description?.trim()) description = meta.description.trim().slice(0, 200)
    if (!image && meta.image) image = meta.image
  }

  return { title, description, image }
}
