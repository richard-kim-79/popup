// ============================================================
// 검색 갤러리 노출용 제목·설명 추출 — 블록에서 자동 도출
// app/search/page.tsx의 extractTitleFromBlocks와 동일 우선순위(h1→h2→text)
// ============================================================

interface MiniBlock {
  type?: string
  content?: string
}

/** 블록 배열에서 갤러리 표시용 title/description 도출. title 없으면 null(=노출 부적합) */
export function deriveListing(blocks: unknown): {
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

  return { title, description }
}
