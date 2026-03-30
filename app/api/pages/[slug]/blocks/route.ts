import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<{ ok: true } | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null)

  if (!body?.editToken || !Array.isArray(body.blocks)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (!verifyEditToken(body.editToken, slug)) {
    return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  // 잠긴 페이지는 편집 불가
  const { data: page } = await supabase
    .from('pages')
    .select('locked, deleted_at')
    .eq('slug', slug)
    .single()

  if (!page || page.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (page.locked) {
    return NextResponse.json({ error: '잠긴 페이지입니다. 플랜을 업그레이드하세요.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('pages')
    .update({ blocks: body.blocks })
    .eq('slug', slug)

  if (error) {
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
