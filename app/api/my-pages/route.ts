import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

interface PageRow {
  slug: string
  blocks: unknown[]
  expires_at: string
}

interface PageEmailRow {
  page_id: string
  created_at: string
  pages: PageRow | null
}

interface PageResult {
  slug: string
  title: string
  expires_at: string
}

export async function GET(req: NextRequest): Promise<NextResponse<{ pages: PageResult[] } | { error: string }>> {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Look up pages linked to this email via page_emails
  const { data: linked } = await supabase
    .from('page_emails')
    .select('page_id, created_at, pages(slug, blocks, expires_at, deleted_at)')
    .eq('email', email)
    .is('pages.deleted_at', null)
    .order('created_at', { ascending: false })

  const rows = (linked ?? []) as PageEmailRow[]

  const pages: PageResult[] = rows
    .filter((r) => r.pages !== null)
    .map((r) => {
      const page = r.pages as PageRow
      const blocks = (page.blocks ?? []) as Array<{ type: string; content?: string }>
      const titleBlock = blocks.find((b) => b.type === 'h1' && b.content?.trim())
      const title = titleBlock?.content?.trim() ?? page.slug
      return { slug: page.slug, title, expires_at: page.expires_at }
    })

  return NextResponse.json({ pages })
}
