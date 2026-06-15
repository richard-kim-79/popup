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

  // ── orphan Storage 객체 정리 (fire-and-forget) ──────────────
  // 저장된 blocks에서 더 이상 참조되지 않는 media 파일 제거
  void cleanupOrphans(supabase, slug, body.blocks as unknown[]).catch(() => {})

  return NextResponse.json({ ok: true })
}

/**
 * blocks에서 참조하는 media URL과 Storage의 {slug}/ 객체를 비교해
 * 미참조 객체를 삭제. 실패해도 blocks 저장 자체엔 영향 없음.
 */
async function cleanupOrphans(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
  blocks: unknown[],
): Promise<void> {
  // 1. blocks에서 참조하는 파일명 집합 추출 (image/video/link 블록의 url)
  const referenced = new Set<string>()
  for (const b of blocks) {
    const url = (b as { url?: unknown }).url
    if (typeof url === 'string' && url.includes(`/${slug}/`)) {
      const fname = url.split('/').pop()
      if (fname) referenced.add(fname)
    }
  }

  // 2. Storage의 {slug}/ 객체 목록
  const { data: objects } = await supabase.storage.from('media').list(slug, { limit: 1000 })
  if (!objects || objects.length === 0) return

  // 3. 참조 안 되는 객체 → 삭제 대상
  const toRemove = objects
    .filter((o) => !referenced.has(o.name))
    .map((o) => `${slug}/${o.name}`)

  if (toRemove.length > 0) {
    await supabase.storage.from('media').remove(toRemove)
  }
}
