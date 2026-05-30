import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPin } from '@/lib/pin'
import type { Block, ApiError } from '@/types'

interface Body {
  slugOrUrl?: unknown
  pin?: unknown
}

interface SuccessResponse {
  ok: true
  slug: string
  title: string
}

/** URL 입력에서 slug 추출 (https://popup2026.com/abc123, abc123 등 모두 처리) */
function extractSlug(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  const match = trimmed.match(/\/([^/?#]+)$/)
  return match ? match[1] : trimmed
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<SuccessResponse | ApiError>> {
  // 로그인 필수
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as Body | null
  const rawInput = typeof body?.slugOrUrl === 'string' ? body.slugOrUrl.trim() : ''
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''

  if (!rawInput) {
    return NextResponse.json({ error: '페이지 주소를 입력해주세요.' }, { status: 400 })
  }
  if (!pin || pin.length < 4 || pin.length > 8) {
    return NextResponse.json({ error: 'PIN은 4~8자리여야 합니다.' }, { status: 400 })
  }

  const slug = extractSlug(rawInput)
  const admin = getSupabaseAdmin()

  // 페이지 조회
  const { data: page } = await admin
    .from('pages')
    .select('id, slug, blocks, html_content, pin_hash, user_id, deleted_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!page) {
    return NextResponse.json({ error: '해당 페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 이미 본인 소유면 멱등성 처리
  if (page.user_id === userId) {
    const title = extractTitle(page)
    return NextResponse.json({ ok: true, slug: page.slug, title })
  }

  // PIN 검증
  const valid = await verifyPin(pin, page.pin_hash)
  if (!valid) {
    return NextResponse.json({ error: 'PIN이 올바르지 않습니다.' }, { status: 401 })
  }

  // user_id 업데이트 (이미 다른 사용자 소유여도 PIN을 알면 양도 가능 — 의도)
  const { error: updateErr } = await admin
    .from('pages')
    .update({ user_id: userId })
    .eq('slug', slug)

  if (updateErr) {
    return NextResponse.json({ error: '등록에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug: page.slug, title: extractTitle(page) })
}

function extractTitle(page: { blocks: unknown; html_content: string | null; slug: string }): string {
  if (page.html_content) return 'HTML 페이지'
  const blocks = (page.blocks ?? []) as Block[]
  const h1 = blocks.find((b) => b.type === 'h1' && (b as { content?: string }).content?.trim())
  return h1 ? (h1 as { content: string }).content.trim() : page.slug
}
