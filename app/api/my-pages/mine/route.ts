import { NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { extractHtmlMeta } from '@/lib/html-meta'
import { blocksPlainText } from '@/lib/search-text'

interface PageResult {
  slug: string
  title: string
  expires_at: string
  created_at: string
  is_html: boolean
  is_pdf: boolean
  locked: boolean
  listed: boolean
  searchText: string  // 제목 + 본문(소문자) — 문서 검색용
}

interface Block { type: string; content?: string }

interface Row {
  slug: string
  blocks: unknown
  expires_at: string
  created_at: string
  html_content: string | null
  pdf_url: string | null
  listing_title: string | null
  locked: boolean
  deleted_at: string | null
  listed: boolean
}

const SELECT_COLS = 'slug, blocks, expires_at, created_at, html_content, pdf_url, listing_title, locked, deleted_at, listed'

export async function GET(): Promise<NextResponse<{ pages: PageResult[] } | { error: string }>> {
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const email = user.email?.toLowerCase() ?? ''

  // 1) user_id 직접 소유
  const { data: owned } = await supabase
    .from('pages')
    .select(SELECT_COLS)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // 2) page_emails로 연결된 페이지 (결제 시 입력한 이메일)
  const { data: linked } = email
    ? await supabase
        .from('page_emails')
        .select(`pages(${SELECT_COLS})`)
        .eq('email', email)
    : { data: [] as Array<{ pages: Row | null }> }

  const seen = new Set<string>()
  const pages: PageResult[] = []

  const pushPage = (row: Row | null) => {
    if (!row || row.deleted_at || seen.has(row.slug)) return
    seen.add(row.slug)
    // 제목 + 검색 본문: PDF면 파일명, HTML이면 메타, 블록이면 블록 평문
    let title: string
    let contentText: string
    if (row.pdf_url) {
      title = row.listing_title?.trim() || 'PDF 문서'
      contentText = title
    } else if (row.html_content) {
      const meta = extractHtmlMeta(row.html_content)
      title = meta.title?.slice(0, 80) ?? 'HTML 페이지'
      contentText = [meta.title, meta.description].filter(Boolean).join(' ')
    } else {
      const blocks = (row.blocks ?? []) as Block[]
      const titleBlock = blocks.find((b) => b.type === 'h1' && b.content?.trim())
      title = titleBlock?.content?.trim() ?? row.slug
      contentText = blocksPlainText(row.blocks)
    }
    pages.push({
      slug: row.slug,
      title,
      expires_at: row.expires_at,
      created_at: row.created_at,
      is_html: !!row.html_content,
      is_pdf: !!row.pdf_url,
      locked: row.locked,
      listed: !!row.listed,
      searchText: `${title} ${contentText}`.toLowerCase(),
    })
  }

  ;((owned ?? []) as unknown as Row[]).forEach(pushPage)
  ;(linked ?? []).forEach((r) => pushPage((r.pages as unknown) as Row | null))

  // 기본 정렬: 최신 등록 순 (클라이언트가 다시 정렬 가능)
  pages.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  return NextResponse.json({ pages })
}
