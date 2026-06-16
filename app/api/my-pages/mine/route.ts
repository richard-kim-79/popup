import { NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { extractHtmlMeta } from '@/lib/html-meta'

interface PageResult {
  slug: string
  title: string
  expires_at: string
  created_at: string
  is_html: boolean
  locked: boolean
  listed: boolean
}

interface Block { type: string; content?: string }

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
    .select('slug, blocks, expires_at, created_at, html_content, locked, deleted_at, listed')
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // 2) page_emails로 연결된 페이지 (결제 시 입력한 이메일)
  const { data: linked } = email
    ? await supabase
        .from('page_emails')
        .select('pages(slug, blocks, expires_at, created_at, html_content, locked, deleted_at, listed)')
        .eq('email', email)
    : { data: [] as Array<{ pages: { slug: string; blocks: unknown; expires_at: string; created_at: string; html_content: string | null; locked: boolean; deleted_at: string | null; listed: boolean } | null }> }

  const seen = new Set<string>()
  const pages: PageResult[] = []

  const pushPage = (row: { slug: string; blocks: unknown; expires_at: string; created_at: string; html_content: string | null; locked: boolean; deleted_at: string | null; listed: boolean } | null) => {
    if (!row || row.deleted_at || seen.has(row.slug)) return
    seen.add(row.slug)
    // 제목 추출: HTML 페이지면 <title>/og:title 우선, 블록 페이지면 첫 H1
    let title: string
    if (row.html_content) {
      const meta = extractHtmlMeta(row.html_content)
      title = meta.title?.slice(0, 80) ?? 'HTML 페이지'
    } else {
      const blocks = (row.blocks ?? []) as Block[]
      const titleBlock = blocks.find((b) => b.type === 'h1' && b.content?.trim())
      title = titleBlock?.content?.trim() ?? row.slug
    }
    pages.push({
      slug: row.slug,
      title,
      expires_at: row.expires_at,
      created_at: row.created_at,
      is_html: !!row.html_content,
      locked: row.locked,
      listed: !!row.listed,
    })
  }

  ;(owned ?? []).forEach(pushPage)
  ;(linked ?? []).forEach((r) => pushPage(r.pages))

  // 기본 정렬: 최신 등록 순 (클라이언트가 다시 정렬 가능)
  pages.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  return NextResponse.json({ pages })
}
