import { NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

interface PageResult {
  slug: string
  title: string
  expires_at: string
  is_html: boolean
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
    .select('slug, blocks, expires_at, html_content, deleted_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // 2) page_emails로 연결된 페이지 (결제 시 입력한 이메일)
  const { data: linked } = email
    ? await supabase
        .from('page_emails')
        .select('pages(slug, blocks, expires_at, html_content, deleted_at)')
        .eq('email', email)
    : { data: [] as Array<{ pages: { slug: string; blocks: unknown; expires_at: string; html_content: string | null; deleted_at: string | null } | null }> }

  const seen = new Set<string>()
  const pages: PageResult[] = []

  const pushPage = (row: { slug: string; blocks: unknown; expires_at: string; html_content: string | null; deleted_at: string | null } | null) => {
    if (!row || row.deleted_at || seen.has(row.slug)) return
    seen.add(row.slug)
    const blocks = (row.blocks ?? []) as Block[]
    const titleBlock = blocks.find((b) => b.type === 'h1' && b.content?.trim())
    const title = titleBlock?.content?.trim() ?? (row.html_content ? 'HTML 페이지' : row.slug)
    pages.push({
      slug: row.slug,
      title,
      expires_at: row.expires_at,
      is_html: !!row.html_content,
    })
  }

  ;(owned ?? []).forEach(pushPage)
  ;(linked ?? []).forEach((r) => pushPage(r.pages))

  // 만료일 가까운 순으로 정렬
  pages.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())

  return NextResponse.json({ pages })
}
