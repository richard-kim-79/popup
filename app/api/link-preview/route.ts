import { NextRequest, NextResponse } from 'next/server'
import type { ApiError } from '@/types'

interface LinkMeta {
  title?: string
  description?: string
  favicon?: string
  image?: string
}

// Known SNS domains that block server-side scraping — provide sensible fallbacks
const SNS_FALLBACKS: Record<string, (url: URL) => Partial<LinkMeta>> = {
  'x.com': (url) => ({
    title: `X (Twitter) 게시물`,
    description: url.pathname.split('/').filter(Boolean).join(' / '),
    favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
  }),
  'twitter.com': (url) => ({
    title: `X (Twitter) 게시물`,
    description: url.pathname.split('/').filter(Boolean).join(' / '),
    favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
  }),
  'instagram.com': (url) => ({
    title: 'Instagram 게시물',
    description: url.pathname.split('/').filter(Boolean).join(' / '),
    favicon: 'https://www.google.com/s2/favicons?domain=instagram.com&sz=32',
  }),
  'www.instagram.com': (url) => ({
    title: 'Instagram 게시물',
    description: url.pathname.split('/').filter(Boolean).join(' / '),
    favicon: 'https://www.google.com/s2/favicons?domain=instagram.com&sz=32',
  }),
  'threads.net': () => ({
    title: 'Threads 게시물',
    favicon: 'https://www.google.com/s2/favicons?domain=threads.net&sz=32',
  }),
  'www.threads.net': () => ({
    title: 'Threads 게시물',
    favicon: 'https://www.google.com/s2/favicons?domain=threads.net&sz=32',
  }),
}

function getAttr(html: string, property: string): string | null {
  // Handles both property="..." and name="..." with content in any order
  const re1 = new RegExp(`<meta\\s+(?:[^>]*?)(?:property|name)="${property}"\\s+content="([^"]*)"`, 'i')
  const re2 = new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:[^>]*?)(?:property|name)="${property}"`, 'i')
  return html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? null
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<LinkMeta | ApiError>> {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  const parsed = new URL(url)

  // Check SNS fallback first — these sites block bots
  const fallbackFn = SNS_FALLBACKS[parsed.hostname]
  if (fallbackFn) {
    const meta = fallbackFn(parsed)
    return NextResponse.json({
      title: meta.title ?? parsed.hostname,
      description: meta.description ?? '',
      favicon: meta.favicon ?? `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
      image: meta.image ?? '',
    })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json({
        title: parsed.hostname,
        description: '',
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
        image: '',
      })
    }

    const html = await res.text()

    // Title: og:title > twitter:title > <title>
    const title =
      getAttr(html, 'og:title') ??
      getAttr(html, 'twitter:title') ??
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ??
      parsed.hostname

    // Description: og:description > twitter:description > meta description
    const description =
      getAttr(html, 'og:description') ??
      getAttr(html, 'twitter:description') ??
      getAttr(html, 'description') ??
      ''

    // Image: og:image > twitter:image
    let image =
      getAttr(html, 'og:image') ??
      getAttr(html, 'twitter:image') ??
      ''
    if (image && !image.startsWith('http')) {
      image = image.startsWith('/')
        ? `${parsed.origin}${image}`
        : `${parsed.origin}/${image}`
    }

    // Favicon
    const faviconMatch =
      html.match(/<link\s+[^>]*rel="icon"[^>]*href="([^"]*)"/) ??
      html.match(/<link\s+[^>]*rel="shortcut icon"[^>]*href="([^"]*)"/)
    let favicon = faviconMatch?.[1] ?? ''
    if (favicon && !favicon.startsWith('http')) {
      favicon = favicon.startsWith('/')
        ? `${parsed.origin}${favicon}`
        : `${parsed.origin}/${favicon}`
    }
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`
    }

    return NextResponse.json({
      title: title.slice(0, 200),
      description: description.slice(0, 300),
      favicon,
      image,
    })
  } catch {
    return NextResponse.json({
      title: parsed.hostname,
      description: '',
      favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
      image: '',
    })
  }
}
