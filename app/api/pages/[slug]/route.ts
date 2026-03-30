import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { daysLeft } from '@/lib/slug'
import type { PageResponse, ApiError, Block } from '@/types'

type Params = { params: Promise<{ slug: string }> }

export async function GET(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse<PageResponse | ApiError>> {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('pages')
    .select('blocks, locked, expires_at, view_count, deleted_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 조회수 증가 (fire-and-forget)
  supabase
    .from('pages')
    .update({ view_count: data.view_count + 1 })
    .eq('slug', slug)
    .then(() => {})

  return NextResponse.json({
    blocks: (data.blocks as unknown) as Block[],
    locked: data.locked,
    expiresAt: data.expires_at,
    viewCount: data.view_count,
    daysLeft: daysLeft(data.expires_at),
  })
}
