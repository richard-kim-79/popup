// ============================================================
// 블록 배열에서 검색용 평문 추출 — /my-pages 문서 검색
// h1/h2/text → content, button → label, link → title+description
// ============================================================

interface MiniBlock {
  type?: string
  content?: string
  label?: string
  title?: string
  description?: string
}

/** 블록에서 검색 대상 평문을 모아 maxLen까지 반환 */
export function blocksPlainText(blocks: unknown, maxLen = 600): string {
  const arr: MiniBlock[] = Array.isArray(blocks) ? (blocks as MiniBlock[]) : []
  const parts: string[] = []

  for (const b of arr) {
    const t = b?.type
    if (t === 'h1' || t === 'h2' || t === 'text') {
      if (typeof b.content === 'string') parts.push(b.content)
    } else if (t === 'button') {
      if (typeof b.label === 'string') parts.push(b.label)
    } else if (t === 'link') {
      if (typeof b.title === 'string') parts.push(b.title)
      if (typeof b.description === 'string') parts.push(b.description)
    }
    if (parts.join(' ').length >= maxLen) break
  }

  return parts.join(' ').slice(0, maxLen)
}
