// ============================================================
// HTML 문자열에서 OG 메타 정보 추출 (정규식 기반, 의존성 없음)
// ============================================================

export interface HtmlMeta {
  title: string | null
  description: string | null
  image: string | null
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
}

/** <meta property="og:foo" content="..."> 또는 <meta name="foo" content="..."> 추출 */
function getMeta(html: string, ...keys: { attr: 'property' | 'name'; value: string }[]): string | null {
  for (const { attr, value } of keys) {
    // attr 순서 무관: <meta property="..." content="..."> 또는 <meta content="..." property="...">
    const re1 = new RegExp(
      `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["']`,
      'i',
    )
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`,
      'i',
    )
    const m = html.match(re1) ?? html.match(re2)
    if (m && m[1]) return decodeHtmlEntities(m[1]).trim()
  }
  return null
}

/** HTML 문자열에서 OG 메타 추출 */
export function extractHtmlMeta(html: string): HtmlMeta {
  // <title>...</title>
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const docTitle = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : null

  // og:title 우선, 없으면 <title>
  const title = getMeta(html, { attr: 'property', value: 'og:title' }) ?? docTitle

  // og:description 우선, 없으면 meta description
  const description =
    getMeta(html,
      { attr: 'property', value: 'og:description' },
      { attr: 'name', value: 'description' },
    )

  // og:image (절대 URL만 신뢰)
  const rawImage = getMeta(html,
    { attr: 'property', value: 'og:image' },
    { attr: 'name', value: 'twitter:image' },
  )
  const image = rawImage && /^https?:\/\//i.test(rawImage) ? rawImage : null

  return { title, description, image }
}
