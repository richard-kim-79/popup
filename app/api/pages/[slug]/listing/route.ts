import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { deriveListing } from '@/lib/listing'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

/**
 * PATCH /api/pages/[slug]/listing — 검색 갤러리 노출 on/off (소유자)
 *
 * body: { listed: boolean }
 * - false: 갤러리에서 숨김 + gallery_opt_out=true (자동 노출도 차단)
 * - true:  다시 노출 + 블록에서 제목 재도출
 * 인증: 로그인 사용자가 페이지 소유자(user_id 일치)
 */
export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<{ listed: boolean } | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null) as { listed?: unknown } | null

  if (typeof body?.listed !== 'boolean') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: page } = await admin
    .from('pages')
    .select('user_id, blocks, html_content, deleted_at')
    .eq('slug', slug)
    .single()

  if (!page || page.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }
  if (page.user_id !== userId) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  if (body.listed) {
    const { title, description, image } = deriveListing(page.blocks, page.html_content)
    const { error } = await admin
      .from('pages')
      .update({
        listed: true,
        auto_listed: true,
        gallery_opt_out: false,
        listing_title: title,
        listing_description: description,
        listing_image: image,
        listed_at: new Date().toISOString(),
      })
      .eq('slug', slug)
    if (error) return NextResponse.json({ error: '갤러리 공개에 실패했습니다.' }, { status: 500 })
  } else {
    const { error } = await admin
      .from('pages')
      .update({ listed: false, gallery_opt_out: true })
      .eq('slug', slug)
    if (error) return NextResponse.json({ error: '갤러리 숨김에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ listed: body.listed })
}
