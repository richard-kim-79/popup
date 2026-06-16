import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase-server'
import { hashPin } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import { generateUniqueSlug } from '@/lib/slug'
import { checkStorageQuota } from '@/lib/subscription'
import { getTemplateById } from '@/lib/templates'
import { assignBlockIds } from '@/lib/validate-blocks'
import { normalizeSource } from '@/lib/source'
import { logPageEvent } from '@/lib/events'
import type { CreatePageResponse, ApiError, Json } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<CreatePageResponse | ApiError>> {
  const body = await req.json().catch(() => null)

  if (!body?.pin || typeof body.pin !== 'string' || body.pin.length < 4 || body.pin.length > 8) {
    return NextResponse.json({ error: 'PIN은 4~8자리여야 합니다.' }, { status: 400 })
  }

  // 템플릿으로 생성: templateId가 있으면 템플릿 블록으로 시작 (없으면 body.blocks)
  let blocks: Json = (body.blocks ?? []) as Json
  let source = normalizeSource(body.source)
  if (typeof body.templateId === 'string') {
    const template = getTemplateById(body.templateId)
    if (!template) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 400 })
    }
    blocks = assignBlockIds(template.blocks.map((b) => ({ ...b }))) as unknown as Json
    if (!source) source = normalizeSource(`template:${template.id}`)
  }

  // 로그인 세션이 있으면 user_id 자동 연결
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const userId = userData?.user?.id ?? null

  const supabase = getSupabaseAdmin()

  // 로그인 사용자: 티어별 저장 용량 한도 사전 체크
  const newBytes = Buffer.byteLength(JSON.stringify(blocks), 'utf8')
  const quota = await checkStorageQuota(supabase, userId, newBytes)
  if (quota && !quota.allowed) {
    return NextResponse.json(
      { error: quota.reason ?? '저장 용량을 초과했습니다.' },
      { status: 413 },
    )
  }

  const slug = await generateUniqueSlug()
  const pin_hash = await hashPin(body.pin)

  const now = new Date()
  const expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const delete_at  = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('pages').insert({
    slug,
    blocks,
    pin_hash,
    expires_at,
    delete_at,
    locked: false,
    user_id: userId,
    source,
  })

  if (error) {
    console.error('[POST /api/pages]', error.message)
    return NextResponse.json({ error: '페이지 생성에 실패했습니다.' }, { status: 500 })
  }

  // 채널별 전환 측정 — 생성 이벤트 기록 (fire-and-forget)
  logPageEvent(supabase, 'created', source, slug)

  const editToken = issueEditToken(slug)
  return NextResponse.json({ slug, editToken }, { status: 201 })
}
